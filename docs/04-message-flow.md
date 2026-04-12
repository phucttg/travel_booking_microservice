# 4. Message Flow

## Scenario: Checkout Creation and Payment Intent Setup

1. The browser calls `POST /api/v1/booking/create` through nginx.
2. `booking` authenticates the request through `JwtGuard`, which may call `identity` for remote token validation.
3. `booking` fetches the selected flight from `flight` and the passenger projection from `passenger`.
4. `booking` expires stale pending bookings for the same user and flight, if any.
5. `booking` reserves a seat in `flight`, receiving seat class, computed price, hold token, and hold expiry.
6. `booking` persists a `PENDING_PAYMENT` booking with locked commercial state, including the hold token and `paymentExpiresAt`.
7. `booking` calls `payment` to create a payment intent and returns `BookingCheckoutDto` to the frontend.

### Checkout invariants

- `POST /api/v1/booking/create` rejects a missing `Idempotency-Key` header.
- Reusing the same idempotency key with the same request payload replays the stored checkout response; reusing it with a different payload returns a conflict.
- `paymentExpiresAt` is set to 15 minutes after checkout creation.
- The seat hold is requested until `paymentExpiresAt + 2 minutes`, so `seatHoldExpiresAt` intentionally outlives the payment window.
- After stale pending bookings are expired, any remaining active booking for the same user and flight is rejected with business code `ACTIVE_BOOKING_EXISTS`.

### Failure path inside checkout creation

- If booking persistence fails after seat reservation, `booking` immediately publishes `SeatReleaseRequested` as compensation.
- If payment-intent creation fails after the booking row exists, `booking` expires the pending booking and enqueues seat release through the booking outbox.

## Scenario: Payment Success and Seat Commit

Payment success can start from either:

- `PATCH /api/v1/payment/confirm/:id` by an admin
- `POST /api/v1/wallet/pay-booking` by the payment owner
- `POST /api/v1/payment/reconcile-manual` by an admin after matching a bank transfer

The runtime sequence is:

1. `payment` records the attempt or wallet debit and marks the payment `SUCCEEDED`.
2. `payment` writes `PaymentSucceeded` into the payment outbox.
3. The payment outbox dispatcher publishes `PaymentSucceeded` to RabbitMQ.
4. `booking` consumes `PaymentSucceeded`, locks the booking row, and marks the booking `CONFIRMED`.
5. If the booking still has a seat hold token, `booking` enqueues `SeatCommitRequested`.
6. `flight` consumes `SeatCommitRequested` and converts the held seat into a committed, booking-owned seat.
7. `booking` also emits `BookingCreated` after confirmation.

### Seat commit reconciliation

If `SeatCommitRequested` does not result in a committed seat promptly:

1. `booking` calls the internal `GET /api/v1/seat/get-state` route on `flight`.
2. If the hold still exists, `booking` re-enqueues `SeatCommitRequested`.
3. If the hold is gone and the seat is not booked for the booking, `booking` cancels the booking and enqueues `PaymentRefundRequested`.

## Scenario: Payment Failed Attempt

1. An admin calls `PATCH /api/v1/payment/confirm/:id` with a decline scenario.
2. `payment` records a `payment_attempt`, keeps the payment intent in `FAILED`, and writes `PaymentFailed` into the payment outbox.
3. The payment outbox dispatcher publishes `PaymentFailed` to RabbitMQ.
4. No cross-service consumer reacts to `PaymentFailed` today, so the event is currently an audit and observability signal rather than a workflow trigger.

## Scenario: Payment Expiry

1. `payment` scans for expired payment intents in `PENDING`, `PROCESSING`, or `FAILED`.
2. `payment` marks the payment `EXPIRED` and writes `PaymentExpired` to the payment outbox.
3. `booking` consumes `PaymentExpired`.
4. If the booking is still `PENDING_PAYMENT`, `booking` marks it `EXPIRED` and enqueues `SeatReleaseRequested`.
5. `flight` consumes `SeatReleaseRequested` and releases the matching held seat.

The same `EXPIRED` handling also happens when wallet payment is attempted after the payment window has already elapsed.

## Scenario: Cancel Confirmed or Pending Booking

1. The browser calls `PATCH /api/v1/booking/cancel/:id`.
2. `booking` locks the booking row and validates that the related flight is still cancelable.
3. `booking` marks the booking `CANCELED`.
4. If the booking was still `PENDING_PAYMENT`, `booking` enqueues a seat release against the hold token.
5. If the booking was already `CONFIRMED`, `booking` enqueues a seat release against the committed booking ownership.
6. If the related payment has already succeeded, `booking` also enqueues `PaymentRefundRequested`.
7. `payment` consumes `PaymentRefundRequested`, creates a `refund`, credits the user wallet, writes a wallet ledger entry, and emits `PaymentRefunded`.

## Scenario: Passenger Projection and Repair

### Normal sync

1. `identity` creates or updates a user.
2. `identity` writes `UserCreated` or `UserUpdated` into `identity_outbox_message`.
3. The identity outbox dispatcher publishes the event to RabbitMQ.
4. `passenger` consumes the event and either creates or updates the passenger row.
5. `passenger` ignores stale events using `sourceUpdatedAt` and deduplicates by processed message key.

### Repair flow

1. The repair CLI in `identity` loads one user or all users.
2. For each target user it writes a sanitized `UserCreated` event into the identity outbox.
3. The already running identity service dispatcher later publishes those outbox rows to RabbitMQ.
4. `passenger` consumes the sanitized events and repairs the projection safely through unique `userId`, update-or-create logic, and freshness checks.

## Current Event Matrix

| Contract | Produced by | Consumed by | Current note |
| --- | --- | --- | --- |
| `UserCreated` | `identity` | `passenger` | Creates or refreshes passenger projection |
| `UserUpdated` | `identity` | `passenger` | Refreshes passenger projection |
| `UserDeleted` | `identity` | no cross-service consumer today | Published by identity, but passenger does not project deletions automatically |
| `PaymentSucceeded` | `payment` | `booking` | Confirms booking and starts seat commit |
| `PaymentExpired` | `payment` | `booking` | Expires pending booking and triggers seat release |
| `PaymentFailed` | `payment` | no cross-service consumer today | Audit/observability signal for failed admin confirmation attempts |
| `SeatCommitRequested` | `booking` | `flight` | Converts held seat into committed seat ownership |
| `SeatReleaseRequested` | `booking` | `flight` | Releases a held or committed seat during compensation, expiry, or cancel |
| `PaymentRefundRequested` | `booking` | `payment` | Triggers wallet credit refund processing |
| `PaymentRefunded` | `payment` | no cross-service consumer today | Refund completion event without a downstream subscriber |
| `BookingCreated` | `booking` | no cross-service consumer today | Confirmed-booking event emitted after payment success |

## Integration Patterns Used Now

- synchronous orchestration for checkout-critical data
- asynchronous event propagation for payment confirmation, payment expiry, refund execution, and passenger projection
- explicit seat hold and seat commit lifecycle instead of a single reservation flag
- service-local outbox dispatch in `identity`, `booking`, and `payment`
- consumer inbox dedupe in `passenger`, `booking`, `payment`, and `flight`
