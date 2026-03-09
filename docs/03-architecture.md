# 3. High-level Architecture

## Architecture Type

**Microservices Architecture** with **Event-Driven** inter-service communication, organized using **Vertical Slice Architecture** and **CQRS** within each service.

## System Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                        │
│                                                                                  │
│      ┌──────────────┐     ┌──────────────────────────────────────────┐           │
│      │  Frontend     │     │  REST Client (booking.rest / Swagger)    │           │
│      │  React/Vite   │     │  Postman / curl                         │           │
│      │  :80 (nginx)  │     └──────────────────────────────────────────┘           │
│      └──────┬───────┘                                                            │
│             │ HTTP                                                                │
├─────────────┼────────────────────────────────────────────────────────────────────┤
│             │              SERVICE LAYER (NestJS)                                │
│             ▼                                                                    │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │  Identity     │   │  Flight      │   │  Passenger   │   │  Booking     │      │
│  │  :3333        │   │  :3344       │   │  :3355       │   │  :3366       │      │
│  │              │   │              │   │              │   │              │      │
│  │ • Login      │   │ • Flights    │   │ • CRUD       │   │ • Create     │      │
│  │ • Users CRUD │   │ • Aircraft   │   │ • Sync via   │   │ • Cancel     │      │
│  │ • JWT Tokens │   │ • Airports   │   │   Events     │   │ • List/Get   │      │
│  │ • Token Val. │   │ • Seats      │   │              │   │              │      │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘      │
│         │                  │                  │                  │              │
│         │    publishes     │    publishes     │   consumes       │  HTTP calls  │
│         ▼                  ▼                  ▼                  ▼              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                         MESSAGE BROKER                                          │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │                     RabbitMQ :5672 / :15672                              │    │
│  │                                                                          │    │
│  │  Exchanges (fanout):                                                     │    │
│  │    user_created ──► passenger.user_created (queue) + DLQ                 │    │
│  │    user_updated ──► passenger.user_updated (queue) + DLQ                 │    │
│  │    flight_created, seat_created, seat_reserved                           │    │
│  │    booking_created                                                       │    │
│  │    seat_release_requested ──► flight.seat_release_requested + DLQ        │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│                          DATA LAYER                                              │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │                   PostgreSQL 16 :5432                                    │    │
│  │                                                                          │    │
│  │  Databases (per-service via env config):                                 │    │
│  │    identity_db  │  flight_db  │  passenger_db  │  booking_db             │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│                       OBSERVABILITY STACK                                        │
│                                                                                  │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐             │
│  │ OTEL       │   │ Prometheus │   │ Tempo      │   │ Loki       │             │
│  │ Collector  │──►│ :9090      │   │ (Traces)   │   │ (Logs)     │             │
│  │ :4317 gRPC │   │ (Metrics)  │   │ :3200      │   │ :3100      │             │
│  └────────────┘   └─────┬──────┘   └─────┬──────┘   └─────┬──────┘             │
│                         │                │                │                     │
│                         └────────────────┼────────────────┘                     │
│                                          ▼                                       │
│                                   ┌────────────┐                                 │
│                                   │  Grafana   │                                 │
│                                   │  :3000     │                                 │
│                                   └────────────┘                                 │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Architectural Characteristics

| Characteristic | Implementation |
|----------------|----------------|
| **CQRS** | Separate `CommandHandler` / `QueryHandler` per feature via `@nestjs/cqrs` |
| **Vertical Slice Architecture** | Each feature is a self-contained folder: controller + command/query + handler |
| **Bounded Contexts** | Identity, Flight, Passenger, Booking — each with own DB schema |
| **Repository Pattern** | Interface-based (`IBookingRepository`, `IFlightRepository`) with DI |
| **Event-Driven** | RabbitMQ fanout exchanges with typed contracts in `building-blocks/contracts/` |
| **Shared Kernel** | `building-blocks/` library with configs, contracts, middleware, auth, telemetry |
| **API Versioning** | URI-based versioning (`/api/v1/...`) |
| **Message Envelope** | Optional schema-versioned envelope with `messageId`, `traceId`, `idempotencyKey` |
