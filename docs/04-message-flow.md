# 4. Message Flow

## Scenario: "User Creates a Booking"

```
 Client                Identity         Booking          Flight           Passenger      RabbitMQ         PostgreSQL
   │                      │                │                │                 │              │                │
   │  POST /login         │                │                │                 │              │                │
   │─────────────────────►│                │                │                 │              │                │
   │  ◄─── JWT Access +   │                │                │                 │              │                │
   │       Refresh Token  │                │                │                 │              │                │
   │                      │                │                │                 │              │                │
   │  POST /booking/create (+ Bearer JWT)  │                │                 │              │                │
   │──────────────────────────────────────►│                │                 │              │                │
   │                      │                │                │                 │              │                │
   │                      │                │  ──── JwtGuard validates ────►  │              │                │
   │                      │                │  POST /validate-access-token    │              │                │
   │                      │  ◄────────────────── (sync HTTP to Identity)     │              │                │
   │                      │                │                │                 │              │                │
   │                      │                │  GET /flight/get-by-id?id=X     │              │                │
   │                      │                │───────────────►│                 │              │                │
   │                      │                │  ◄─── FlightDto │                │              │                │
   │                      │                │                │                 │              │                │
   │                      │                │  GET /passenger/get-by-user-id   │              │                │
   │                      │                │────────────────────────────────►│              │                │
   │                      │                │  ◄─── PassengerDto              │              │                │
   │                      │                │                │                 │              │                │
   │                      │                │  POST /seat/reserve              │              │                │
   │                      │                │───────────────►│                 │              │                │
   │                      │                │  ◄─── SeatDto  │                 │              │                │
   │                      │                │                │                 │              │                │
   │                      │                │  INSERT booking ────────────────────────────────────────────────►│
   │                      │                │  ◄───────────────────────────────────────────── booking saved   │
   │                      │                │                │                 │              │                │
   │                      │                │  publish(BookingCreated) ───────────────────►  │                │
   │                      │                │                │                 │   (fanout)   │                │
   │                      │                │                │                 │              │                │
   │  ◄─── 201 Created   │                │                │                 │              │                │
   │       BookingDto     │                │                │                 │              │                │
   │                      │                │                │                 │              │                │
```

## On Failure (booking INSERT fails after seat reservation)

```
   │                      │                │  INSERT booking fails            │              │                │
   │                      │                │                │                 │              │                │
   │                      │                │  publish(SeatReleaseRequested) ──────────────► │                │
   │                      │                │                │                 │   (fanout)   │                │
   │                      │                │                │  ◄──────────────────consume    │                │
   │                      │                │                │  release seat   │              │                │
   │                      │                │                │  UPDATE seat ───────────────────────────────►  │
   │                      │                │                │                 │              │                │
   │  ◄─── 500 Error     │                │                │                 │              │                │
```

## Integration Patterns Used

1. **Choreography-based Saga** — `Identity` publishes `UserCreated` → `Passenger` consumes and creates passenger record. No central orchestrator.
2. **Compensating Transaction** — When booking INSERT fails after seat reservation, `Booking` publishes `SeatReleaseRequested` to release the reserved seat (partial rollback via event).
3. **Command Handlers (CQRS)** — All write operations go through `@CommandHandler`, reads through `@QueryHandler`.
4. **Synchronous HTTP aggregation** — `Booking.CreateBookingHandler` aggregates data from `Flight` and `Passenger` services via HTTP before persisting.
