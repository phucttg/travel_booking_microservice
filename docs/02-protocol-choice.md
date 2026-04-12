# 2. Protocol Choice

## Communication Protocols

| Protocol | Transport | Current Usage |
| --- | --- | --- |
| HTTP/REST | TCP + JSON | Browser APIs, booking orchestration, payment queries, token introspection |
| AMQP 0-9-1 | TCP via RabbitMQ | Domain events, projections, seat release and commit workflows, payment lifecycle propagation |
| OTLP/gRPC | TCP + gRPC | Trace, metric, and log export to the observability stack |

## Public HTTP Entry Through nginx

The browser talks to nginx in the frontend container, and nginx forwards route families to the correct upstream service.

| Route family | Upstream | Notes |
| --- | --- | --- |
| `/api/v1/identity/*` | `identity` | Public auth endpoints plus authenticated identity APIs |
| `/api/v1/user/*` | `identity` | Authenticated user APIs |
| `/api/v1/flight/*`, `/api/v1/airport/*`, `/api/v1/aircraft/*`, `/api/v1/seat/*` | `flight` | Flight catalog, seat inventory, and admin creation routes |
| `/api/v1/passenger/*` | `passenger` | Passenger projection reads |
| `/api/v1/booking/*` | `booking` | Booking create, list, detail, cancel |
| `/api/v1/payment/*`, `/api/v1/wallet/*` | `payment` | Payment, reconcile, wallet, and refund-related reads/writes |
| `/health/live`, `/health/ready` | `frontend` | Frontend liveness/readiness only |

nginx applies dedicated limit zones to:

- auth-heavy routes such as `login`, `register`, and `refresh-token`
- write-heavy routes such as `booking/create`, `payment/confirm/:id`, `payment/reconcile-manual`, `wallet/topup-requests`, and `wallet/pay-booking`
- read-heavy API families routed by prefix

Within these browser-facing families, only `register`, `login`, `refresh-token`, and health probes are unauthenticated. Other read APIs in `flight`, `passenger`, `booking`, `payment`, and `wallet` require a bearer token.

## Per-service Operational Endpoints

Each backend NestJS service also exposes these process-local endpoints on its own port:

- `/health/live`
- `/health/ready`
- `/metrics`
- `/swagger`

These routes are registered inside the service process rather than through dedicated nginx public paths. Service-level rate limiting explicitly bypasses `/health`, `/internal/health`, `/metrics`, and `/swagger`.

## Service-to-Service HTTP

The codebase currently uses synchronous HTTP only where an immediate answer is required:

- `booking -> flight`: `getFlightById`, `reserveSeat`, and internal `getSeatState`
- `booking -> passenger`: `getPassengerByUserId`
- `booking -> payment`: `createPaymentIntent`, `getPaymentById`, `getPaymentSummariesByIds`
- `flight/passenger/booking/payment -> identity`: `validate-access-token` when remote JWT introspection is enabled

### Internal signed routes

The routes currently guarded by `@InternalOnly()` are:

- `GET /api/v1/seat/get-state`
- `GET /api/v1/internal/health/auth-dependency`

The internal signature scheme uses:

- `x-service-name`
- `x-internal-timestamp`
- `x-internal-signature`

`POST /api/v1/identity/validate-access-token` is different: it is the token-introspection endpoint used by `JwtGuard` for remote validation. When `INTERNAL_SERVICE_AUTH_SECRET` is configured, `JwtGuard` sends the same signature headers, but the route itself is not marked internal-only. Other `booking -> flight/passenger/payment` HTTP calls do not require signed headers by default.

## RabbitMQ Topology and Envelope

The RabbitMQ layer currently uses:

- durable fanout exchanges named after the contract type in snake case
- durable per-service queues such as `booking service.payment_succeeded`
- durable per-queue dead-letter exchanges and dead-letter queues
- manual ack and negative-ack to DLQ on handler failure
- one confirm-channel for publishing and one consumer channel per queue name

### Message envelope

When the envelope is enabled, published messages include:

- `schemaVersion`
- `messageId`
- `occurredAt`
- `producer`
- `traceId`
- `idempotencyKey`
- `payload`

Consumers still accept legacy raw payloads, but the current env templates enable the envelope for all services.

## Current Async Contracts

| Contract | Produced by | Consumed by | Purpose |
| --- | --- | --- | --- |
| `UserCreated` | `identity` | `passenger` | Create or refresh passenger projection |
| `UserUpdated` | `identity` | `passenger` | Refresh passenger projection |
| `UserDeleted` | `identity` | no cross-service consumer today | Emit identity-side user deletion event; passenger does not subscribe today |
| `PaymentSucceeded` | `payment` | `booking` | Confirm booking after settlement |
| `PaymentExpired` | `payment` | `booking` | Expire pending booking and release hold |
| `PaymentFailed` | `payment` | no cross-service consumer today | Record failed manual confirmation attempts |
| `SeatCommitRequested` | `booking` | `flight` | Convert a seat hold into a committed booking-owned seat |
| `SeatReleaseRequested` | `booking`, failure compensation path in `booking` | `flight` | Release held or booked seat depending on booking state |
| `PaymentRefundRequested` | `booking` | `payment` | Refund a previously succeeded payment |
| `PaymentRefunded` | `payment` | no cross-service consumer today | Emit refund completion event |
| `BookingCreated` | `booking` | no cross-service consumer today | Emit confirmed booking event |

Passenger runtime wiring currently subscribes only to `UserCreated` and `UserUpdated`.

## Why This Mix Fits the Current Codebase

- HTTP/REST remains the correct fit where the caller must finish a request/response flow before the frontend can continue.
- AMQP is used for long-running workflow transitions that should remain decoupled from the browser request path.
- Internal signed HTTP avoids exposing seat-state internals publicly while still letting `booking` reconcile delayed seat commits.
- Remote token introspection keeps revocation checks centralized in `identity`, at the cost of synchronous coupling called out separately in the scaling and reliability docs.
