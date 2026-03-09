# 7. Reliability & Delivery Guarantees

## Error Handling Mechanisms

| Mechanism | Location | Description |
|-----------|----------|-------------|
| **Global Exception Filter** | src/building-blocks/filters/error-handlers.filter.ts | Converts all exceptions to RFC 7807 ProblemDocument responses |
| **Input Validation** | src/building-blocks/validation/validation.pipe.ts | `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform` |
| **Contract Validation** | src/building-blocks/validation/validation.utils.ts | `validateModel()` validates inbound RabbitMQ messages against DTO schemas using `class-validator` |
| **Custom Decorators** | src/building-blocks/validation/validation.decorators.ts | `@SanitizedText()`, `@ToInteger()`, `@UppercaseText()`, `@ToDate()` for input sanitization |
| **Config Validation** | src/building-blocks/configs/configs.ts | Joi schema validates all environment variables at startup |
| **Retry with Backoff** | RabbitMQ connection/channel/publish/consume all use `async-retry` | Configurable count, factor, min/max timeout |

## Delivery Guarantees

| Aspect | Current State |
|--------|---------------|
| **RabbitMQ Publish** | Persistent messages (`persistent: true`), durable exchanges. **At-most-once** delivery (no publisher confirms). |
| **RabbitMQ Consume** | Manual ACK (`noAck: false`). Dead-letter exchange on NACK. Prefetch = 1. **At-least-once** delivery on the consumer side. |
| **Compensating Events** | `SeatReleaseRequested` published on booking creation failure — basic compensation. |
| **Idempotency** | `CreateUserConsumerHandler` checks for existing passenger before insert. Message envelope has `idempotencyKey` field but no consumer-side deduplication storage. |
| **Transaction Scope** | No distributed transactions. Each service uses single-entity TypeORM `save()` / `update()` — not wrapped in explicit database transactions. |

## Missing Reliability Features

1. **Outbox Pattern** — Events are published _after_ database writes but not atomically (no transactional outbox). A crash between DB commit and RabbitMQ publish loses the event silently.

2. **Inbox Pattern** — No consumer-side idempotency table to track processed `messageId`s. Redelivered messages may cause duplicate side effects.

3. **Circuit Breaker** — No circuit breaker on the synchronous HTTP calls from `Booking → Flight` and `Booking → Passenger`. If a downstream service is degraded, the caller will exhaust timeouts (60s) without failing fast.

4. **Saga Rollback Completeness** — The `SeatReleaseRequested` compensation only covers seat reservation. If the passenger or flight data was mutated, there's no rollback. The cancel flow also doesn't have compensation for the `BookingCreated` event that may have been consumed downstream.

5. **Publisher Confirms** — RabbitMQ publisher does not use `channel.waitForConfirms()` or confirm mode. Messages can be silently dropped by the broker.

6. **Health Checks for Dependencies** — Only Identity and Flight services have HTTP health checks in Docker Compose. No RabbitMQ or PostgreSQL readiness probes.

7. **Rate Limiting / Throttling** — No rate limiting on any API endpoint.

8. **Distributed Locking** — `reserveSeat` does an optimistic-style find-and-update but no explicit row-level locking (`SELECT ... FOR UPDATE`). Under concurrency, two requests could reserve the same seat.

9. **Graceful Degradation** — No fallback behavior when downstream services are unreachable. The system fails completely rather than degrading gracefully.

10. **Dead-Letter Queue Processing** — Dead-letter queues are configured but there is no automated retry or alerting mechanism for messages in DLQs.

---

# 8. Summary Table

| Dimension | Current State |
|-----------|---------------|
| **Requirements** | Flight booking platform with 4 microservices: Identity (auth/users), Flight (flights/seats/aircraft/airports), Passenger (synced profiles), Booking (reservations). Full observability stack. |
| **Protocol** | REST/HTTP (sync client-facing + inter-service aggregation), AMQP/RabbitMQ (async events), OTLP/gRPC (observability) |
| **Architecture** | Microservices + Event-Driven + CQRS + Vertical Slice + Repository Pattern. Shared kernel in `building-blocks/`. Bounded contexts per service. |
| **Message Flow** | Choreography-based saga with compensating events. Booking aggregates Flight + Passenger via sync HTTP, reserves seat via sync HTTP, publishes `BookingCreated` async. On failure, publishes `SeatReleaseRequested` compensation event. |
| **Data Storage** | PostgreSQL 16 via TypeORM. Per-service logical databases. Schema sync via `synchronize` or migrations. Seeding on bootstrap. RDS-ready with SSL support. |
| **Scaling** | Docker Compose single-instance per service. No replicas, no service discovery, no load balancer. Single Postgres + single RabbitMQ. Bottlenecks: sync HTTP coupling, global channel singleton, per-request token validation against Identity. |
| **Reliability** | At-least-once delivery (consumer ACK + DLQ). Retry with exponential backoff on connections. Global exception filter (RFC 7807). Input validation + contract validation. **Missing:** Outbox/Inbox, circuit breakers, publisher confirms, distributed locking, rate limiting, complete saga rollbacks. |
