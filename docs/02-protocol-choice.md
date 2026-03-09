# 2. Protocol Choice

## Communication Protocols

| Protocol | Transport | Location | Usage |
|----------|-----------|----------|-------|
| **HTTP/REST** | TCP (JSON) | All 4 services expose REST APIs | Synchronous client-facing operations |
| **AMQP 0-9-1** | TCP (RabbitMQ) | src/building-blocks/rabbitmq/ | Asynchronous inter-service event pub/sub |
| **OTLP/gRPC** | TCP (gRPC) | src/building-blocks/openTelemetry/opentelemetry.module.ts | Traces, metrics, logs export to OTEL Collector |

## Communication Style

```
┌────────────────────────────────────────────────────────────────┐
│                  SYNCHRONOUS (HTTP/REST)                       │
│                                                                │
│  Client ──► Identity (login)                                   │
│  Client ──► Flight (create-flight, reserve-seat)               │
│  Client ──► Booking (create-booking)                           │
│  Booking ──► Flight (getFlightById, reserveSeat) via Axios     │
│  Booking ──► Passenger (getPassengerByUserId) via Axios        │
│  JwtGuard ──► Identity (validate-access-token) via fetch()     │
│                                                                │
│              ASYNCHRONOUS (AMQP / RabbitMQ)                    │
│                                                                │
│  Identity ──publish──► UserCreated ──consume──► Passenger      │
│  Identity ──publish──► UserUpdated ──consume──► Passenger      │
│  Flight   ──publish──► FlightCreated, SeatCreated, SeatReserved│
│  Booking  ──publish──► BookingCreated                          │
│  Booking  ──publish──► SeatReleaseRequested ──consume──► Flight│
└────────────────────────────────────────────────────────────────┘
```

**Core networking approach:** Hybrid synchronous + asynchronous. REST for queries & commands requiring immediate response; AMQP fanout exchanges for domain events that propagate state changes across bounded contexts. Each RabbitMQ consumer gets a per-service named queue with dead-letter routing.
