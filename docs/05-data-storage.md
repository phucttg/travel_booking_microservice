# 5. Data Storage

## Database Strategy

| Item | Current implementation |
| --- | --- |
| RDBMS | PostgreSQL 16 |
| ORM | TypeORM |
| Database ownership | logical database per service on the same PostgreSQL platform |
| Schema change mechanism | TypeORM migrations |
| Local migration mode | `POSTGRES_MIGRATIONS_RUN=true` in `.env.docker` templates |
| Cloud deploy mode | migrations run as dedicated ECS tasks before service rollout |

## Service Persistence Model

### Identity

| Table | Purpose |
| --- | --- |
| `user` | auth identity, profile, role, passport number, age, passenger type |
| `token` | access/refresh token records and blacklist state |
| `identity_outbox_message` | pending identity events for RabbitMQ dispatch |

Important constraints and indexes:

- unique email constraint on `user.email`
- token lookup indexes for access-token and refresh-token validation
- outbox unique `messageId` and pending-delivery index

### Passenger

| Table | Purpose |
| --- | --- |
| `passenger` | passenger projection keyed by `userId` |
| `passenger_processed_message` | consumer dedupe for identity events |

Important fields:

- `userId`
- `sourceUpdatedAt` for freshness checks
- `name`, `passportNumber`, `age`, `passengerType`

Important constraints and indexes:

- unique index on `passenger.userId`
- unique processed-message index on `(consumer, messageKey)`

### Flight

| Table | Purpose |
| --- | --- |
| `flight` | scheduled flight and pricing base fare |
| `airport` | airport catalog |
| `aircraft` | aircraft catalog and model metadata |
| `seat` | seat inventory, seat class/type, and hold/commit state |
| `flight_processed_message` | consumer dedupe for seat workflow events |

Important flight/seat fields:

- `flight.price` is the base fare
- `flight.flightNumber` + `flight.flightDate` uniquely identify a sellable flight instance
- create-flight keeps `flightDate` as backward-compatible input, but the stored canonical `flightDate` is derived from `departureDate` using the Asia/Ho_Chi_Minh business day
- `seat.seatState` stores `AVAILABLE`, `HELD`, or `BOOKED`
- `seat.holdToken`, `seat.holdExpiresAt`, `seat.heldAt`
- `seat.reservedBookingId` for committed booking ownership
- seat inventory is auto-generated from the aircraft model when a flight is created

Important constraints and indexes:

- unique index on `seat(flightId, seatNumber)`
- unique index on `flight(flightNumber, flightDate)`
- index on `flight.flightDate`
- index on `(seatState, holdExpiresAt)` for hold sweeping

### Booking

| Table | Purpose |
| --- | --- |
| `booking` | booking lifecycle, locked fare, payment reference, and seat hold/commit tracking |
| `booking_idempotency_record` | request-level idempotency for booking creation |
| `booking_processed_message` | consumer dedupe for payment events |
| `booking_outbox_message` | outbound booking events for RabbitMQ dispatch |

Important booking fields:

| Field | Purpose |
| --- | --- |
| `bookingStatus` | `PENDING_PAYMENT`, `CONFIRMED`, `EXPIRED`, `CANCELED` |
| `price` | seat-aware amount locked at reservation time |
| `currency` | locked booking currency, currently `VND` |
| `seatClass` | reserved seat class |
| `paymentId` | payment reference in the payment service |
| `paymentExpiresAt` | payment window deadline |
| `seatHoldToken` | token used to commit or release the held seat |
| `seatHoldExpiresAt` | hold expiry mirrored from flight |
| `seatCommitRequestedAt` | last enqueue time for seat commit |
| `seatCommittedAt` | timestamp when commit reconciliation sees the seat as booked |
| `confirmedAt`, `expiredAt`, `canceledAt` | state transition timestamps |

Important constraints and indexes:

- unique index on `booking.paymentId` when present
- partial unique index on `(userId, flightId)` for active bookings where status is `PENDING_PAYMENT` or `CONFIRMED`
- pending hold expiry index on `seatHoldExpiresAt`
- confirmed seat-commit index on `seatCommittedAt`
- outbox unique `messageId` and pending-delivery index

### Payment

| Table | Purpose |
| --- | --- |
| `payment_intent` | main payment state per booking |
| `payment_attempt` | fake/manual payment attempts and their result status |
| `refund` | refund records |
| `payment_idempotency_record` | request-level idempotency for payment confirmation |
| `payment_processed_message` | consumer dedupe for refund requests |
| `payment_outbox_message` | outbound payment events for RabbitMQ dispatch |
| `wallet` | per-user wallet balance |
| `wallet_topup_request` | user-submitted wallet top-up requests |
| `wallet_ledger` | immutable wallet balance transitions |

Important payment fields:

| Field | Purpose |
| --- | --- |
| `payment_intent.bookingId` | one payment intent per booking |
| `paymentCode` | code used for manual transfer reconciliation |
| `paymentStatus` | `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `EXPIRED` |
| `refundStatus` | refund lifecycle state |
| `expiresAt`, `completedAt`, `refundedAt` | payment window, settlement time, and refund completion time |
| `providerTxnId` | unique bank/provider transaction identifier when reconciled |
| `providerTransferContent`, `providerTransferredAmount` | reconciliation evidence |
| `reconciledAt`, `reconciledBy` | manual reconcile audit fields |

Important payment-attempt fields:

- `paymentAttempt.paymentId`
- `paymentAttempt.scenario`
- `paymentAttempt.paymentStatus`
- one row per simulated/manual attempt, used as audit history around confirm and reconcile flows

Important wallet fields:

- `wallet.userId` is unique
- wallet rows are created lazily during top-up approval and wallet booking payment flows
- `wallet_topup_request.providerTxnId` is unique
- wallet ledger rows record `balanceBefore`, `balanceAfter`, `referenceType`, and `referenceId`

Important constraints and indexes:

- unique `payment_intent.bookingId`
- unique `payment_intent.paymentCode`
- partial unique index on `payment_intent.providerTxnId`
- unique idempotency index on `(scope, idempotencyKey)`
- unique processed-message index on `(consumer, messageKey)`
- top-up request index on `(userId, status)`
- outbox unique `messageId` and pending-delivery index

## Pricing and Commercial State

- `flight.price` remains the base fare.
- Seat price is computed at runtime from seat class and then locked into the booking.
- Current seat-class multipliers in code are:
  - `ECONOMY = 1.0`
  - `BUSINESS = 1.75`
  - `FIRST_CLASS = 2.5`
- Wallet balances and wallet ledgers are stored in integer VND amounts.

## Runtime-backed Invariants

- `POST /api/v1/booking/create` requires `Idempotency-Key` and persists request-level replay state in `booking_idempotency_record` under scope `booking-create`.
- `PATCH /api/v1/payment/confirm/:id` requires `Idempotency-Key` and persists replay state in `payment_idempotency_record` under scope `payment-confirm`.
- The checkout payment window is 15 minutes, and the seat hold expiry is stored 2 minutes later.
- Booking creation first expires stale pending rows for the same user and flight, then rejects any remaining active booking with `ACTIVE_BOOKING_EXISTS`; the partial unique active-booking index backs that invariant at the database level.
- `POST /api/v1/payment/get-summaries-by-ids` accepts at most 100 unique positive ids.
- Each user may have at most 3 pending wallet top-up requests.
- Wallet rows are created on demand, while wallet balances and ledger amounts remain integer VND values.

## Delivery-Support Tables

Across the services, the following persistence patterns now exist:

- outbox tables in `identity`, `booking`, and `payment`
- processed-message tables in `passenger`, `booking`, `payment`, and `flight`
- idempotency tables in `booking` and `payment`

These tables are part of the runtime model, not just auxiliary bookkeeping. They support retries, dedupe, and event dispatch visibility.
