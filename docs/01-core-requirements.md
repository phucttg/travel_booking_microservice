# 1. Core Requirements and Capability Map

## Problem Statement

This system solves airline travel-booking coordination across multiple bounded contexts. It has to authenticate users, maintain passenger projections, publish and sell seat inventory, create bookings with a realistic payment window, settle or expire payments, and keep cross-service state transitions consistent enough for a cloud-hosted demo environment.

## Current Runtime Shape

The implemented codebase contains:

- one browser-facing frontend served by nginx
- five backend services: `identity`, `flight`, `passenger`, `booking`, `payment`
- one shared PostgreSQL platform with a logical database per service
- RabbitMQ for asynchronous workflow coordination
- Redis for service-level rate limiting
- OpenTelemetry, Prometheus, Loki, Tempo, and Grafana for observability

## Implemented Capability Map

| Capability | Primary entrypoint | Notes |
| --- | --- | --- |
| Public user registration | `src/identity/src/auth/features/v1/register/register.ts` | Self-service `POST /api/v1/identity/register`, creates a `USER` role account |
| Public login and refresh token | `src/identity/src/auth/features/v1/login/login.ts`, `refresh-token/refresh-token.ts` | Unauthenticated `POST /api/v1/identity/login` and `POST /api/v1/identity/refresh-token` |
| Authenticated logout | `src/identity/src/auth/features/v1/logout/logout.ts` | `POST /api/v1/identity/logout` requires a bearer token |
| Access-token validation | `src/identity/src/auth/features/v1/validate-token/validate-token.ts` | Token-introspection endpoint used by remote `JwtGuard` validation; not marked `@InternalOnly()` |
| Current-user profile | `src/identity/src/user/features/v1/get-me/get-me.ts` | Authenticated `GET /api/v1/user/me` |
| Admin user CRUD | `src/identity/src/user/features/v1/*` | Admin create, list, view, update, delete flows |
| Identity event publication | `src/identity/src/user/services/identity-user-event-publisher.service.ts` | `UserCreated`, `UserUpdated`, `UserDeleted` are enqueued into the identity outbox |
| Airport admin create + query | `src/flight/src/airport/features/v1/*` | Create and query airport catalog |
| Aircraft admin create + query | `src/flight/src/aircraft/features/v1/*` | Create and query aircraft catalog |
| Flight admin create + query | `src/flight/src/flight/features/v1/*` | Create and list/view flights, derive canonical `flightDate` from `departureDate`, and validate schedule and inventory setup |
| Flight and seat authenticated reads | `src/flight/src/flight/features/v1/get-flights/get-flights.ts`, `get-flight-by-id/get-flight-by-id.ts`, `src/flight/src/seat/features/v1/get-*/` | Bearer token required; non-admin flight list queries exclude past `flightDate` values |
| Seat inventory and reservation | `src/flight/src/seat/features/v1/*` | Seat create, reserve, available-seat query, seat-state query, reconcile-missing |
| Seat hold maintenance | `src/flight/src/seat/services/seat-hold-sweeper.service.ts` | Releases expired held seats |
| Passenger projection sync | `src/passenger/src/user/consumers/create-user.ts`, `update-user.ts` | Builds passenger read model from `UserCreated` and `UserUpdated`; `UserDeleted` is not consumed today |
| Passenger read APIs | `src/passenger/src/passenger/features/v1/*` | Passenger list is admin-only; get-by-id and get-by-user-id are owner-or-admin |
| Booking checkout creation | `src/booking/src/booking/features/v1/create-booking/create-booking.ts` | Requires `Idempotency-Key`, resolves flight + passenger, reserves seat, persists pending booking, creates payment intent, and uses a 15-minute payment window with a seat hold that lasts 2 minutes longer |
| Booking list/detail | `src/booking/src/booking/features/v1/get-bookings/get-bookings.ts`, `get-booking-by-id/get-booking-by-id.ts` | Authenticated booking reads |
| Booking cancellation | `src/booking/src/booking/features/v1/cancel-booking/cancel-booking.ts` | Releases seat and may enqueue refund |
| Booking seat maintenance | `src/booking/src/booking/services/booking-pending-seat-sweeper.service.ts`, `booking-seat-commit-reconciler.service.ts` | Expires stale holds and reconciles delayed seat commits |
| Payment intent creation | `src/payment/src/payment/features/v1/create-payment-intent/create-payment-intent.ts` | One payment intent per booking |
| Manual payment confirmation | `src/payment/src/payment/features/v1/confirm-payment/confirm-payment.ts` | Admin-only, idempotent confirm flow with fake scenarios |
| Manual payment reconcile | `src/payment/src/payment/features/v1/reconcile-manual/reconcile-manual.ts` | Admin-only bank-transfer reconciliation by payment code and transfer metadata; backend API exists even though the SPA has no dedicated manual reconcile form yet |
| Payment query APIs | `src/payment/src/payment/features/v1/get-payment-*` | Owner-or-admin lookups by payment id or booking id, plus batch summary reads capped at 100 ids |
| Wallet balance and top-up review | `src/payment/src/payment/features/v1/wallet/wallet.ts` | Wallet read, top-up request create, admin approve/reject, pay booking from wallet, max 3 pending top-up requests per user, lazy wallet creation, integer VND balances/ledgers |
| Payment expiry automation | `src/payment/src/payment/scheduler/payment-expiry.scheduler.ts` | Expires stale payments and emits `PaymentExpired` |
| Refund processing | `src/payment/src/payment/consumers/payment-refund-requested.consumer.ts` | Credits refunds back into wallet ledger |
| Frontend end-user screens | `src/frontend/src/App.tsx` and `src/frontend/src/pages/*` | Auth, dashboard, flights, bookings, wallet |
| Frontend admin screens | `src/frontend/src/pages/users/*`, `airports/*`, `aircrafts/*`, `payments/AdminPaymentReconcilePage.tsx` | Admin operational surfaces; `/payments/reconcile` is a wallet top-up review inbox rather than a dedicated manual payment reconcile UI |

## Auth and Access Matrix

| Surface | Access | Current behavior |
| --- | --- | --- |
| `POST /api/v1/identity/register`, `POST /api/v1/identity/login`, `POST /api/v1/identity/refresh-token` | unauthenticated | Browser-entry auth routes |
| `POST /api/v1/identity/logout`, `GET /api/v1/user/me` | authenticated | Bearer token required |
| `GET /api/v1/flight/get-all`, `GET /api/v1/flight/get-by-id`, seat read APIs | authenticated | Non-admin flight list queries are filtered to current/future `flightDate` values |
| `GET /api/v1/passenger/get-all` | admin-only | Non-admin callers receive `403` |
| `GET /api/v1/passenger/get-by-id`, `GET /api/v1/passenger/get-by-user-id` | owner-or-admin | Non-admin callers can only access their own passenger projection |
| `POST /api/v1/booking/create`, `GET /api/v1/booking/*`, `PATCH /api/v1/booking/cancel/:id` | authenticated | User-scoped booking flow with duplicate active-booking protection |
| `GET /api/v1/payment/*`, `POST /api/v1/payment/get-summaries-by-ids`, `GET /api/v1/wallet/me`, `GET /api/v1/wallet/topup-requests/my`, `POST /api/v1/wallet/topup-requests`, `POST /api/v1/wallet/pay-booking` | authenticated | Payment reads are owner-or-admin; wallet endpoints are current-user scoped |
| `PATCH /api/v1/payment/confirm/:id`, `POST /api/v1/payment/reconcile-manual`, `GET /api/v1/wallet/topup-requests`, `PATCH /api/v1/wallet/topup-requests/:id/approve`, `PATCH /api/v1/wallet/topup-requests/:id/reject` | admin-only | Manual settlement and wallet-review operations require an admin token |

## User-Facing and Admin Surfaces

### End-user surfaces

- login and registration
- dashboard and flight browsing
- booking checkout, seat selection, booking list, booking detail, booking cancel
- wallet balance, wallet top-up request submission, wallet booking payment

### Admin surfaces

- user management
- airport, aircraft, and flight creation
- seat inventory management
- passenger read-model inspection
- wallet top-up review
- backend manual payment reconciliation API capability

## Frontend Coverage vs Backend Capability

- `src/frontend/src/App.tsx` wires public routes for `/login` and `/register`; every other screen sits behind `ProtectedRoute`, with admin-only pages behind `AdminRoute`.
- The current admin route `/payments/reconcile` renders `AdminPaymentReconcilePage`, which reads and reviews wallet top-up requests.
- `POST /api/v1/payment/reconcile-manual` is implemented in the payment service, but the current SPA does not expose it through a dedicated browser form.

## Operational Requirements Already Implemented

- per-service `/health/live` and `/health/ready`
- per-service `/metrics` for Prometheus scraping
- per-service `/swagger`
- local Docker Compose bootstrap and smoke scripts
- GitHub Actions PR CI, release build, staging deploy, and production deploy workflows
- evidence pack for public access, cloud deployment, and CI/CD verification
