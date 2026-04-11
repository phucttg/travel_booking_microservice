# 6. Scaling Strategy

## Current Scaling Model

The system uses **Docker Compose** for both local development and deployment, with a per-service container model. There's also an **RDS override** compose file for AWS-managed PostgreSQL.

```
┌───────────────────────── Docker Network: "booking" ────────────────────────────┐
│                                                                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                │
│  │Identity │ │ Flight  │ │Passenger│ │ Booking │ │Frontend │                │
│  │  :3333  │ │  :3344  │ │  :3355  │ │  :3366  │ │   :80   │                │
│  │ (Node)  │ │ (Node)  │ │ (Node)  │ │ (Node)  │ │ (nginx) │                │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘                │
│       │           │           │           │           │                       │
│  ┌────┴───────────┴───────────┴───────────┴───────────┘                       │
│  │                                                                             │
│  │  ┌──────────┐   ┌──────────┐                                               │
│  │  │PostgreSQL│   │ RabbitMQ │                                               │
│  │  │  :5432   │   │  :5672   │                                               │
│  │  │ (single) │   │ (single) │                                               │
│  │  └──────────┘   └──────────┘                                               │
│  │                                                                             │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  │   OTEL   │ │Prometheus│ │  Tempo   │ │   Loki   │ │ Grafana  │        │
│  │  │Collector │ │  :9090   │ │  :3200   │ │  :3100   │ │  :3000   │        │
│  │  │  :4317   │ │          │ │          │ │          │ │          │        │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  │                                                                             │
└──┴─────────────────────────────────────────────────────────────────────────────┘
```

## Local Env Bootstrap

Committed env files are limited to templates only:

- `src/*/.env.example` for direct host runs
- `src/*/.env.docker.example` for the default Docker Compose stack
- `src/*/.env.rds.example` for the RDS troubleshooting overlay

Materialize ignored local env files with the helper script:

```bash
bash deployments/scripts/dev-up.sh
```

The default local stack starts the app services and core dependencies only. To add the optional local observability stack:

```bash
bash deployments/scripts/dev-up.sh --observability
```

To include the troubleshooting overlay for shared RDS-style dependencies:

```bash
bash deployments/scripts/dev-up.sh --rds
```

To combine the RDS troubleshooting overlay with the optional observability services:

```bash
bash deployments/scripts/dev-up.sh --rds --observability
```

The script creates missing local env files from the committed templates without overwriting existing files, then runs Docker Compose. For direct host runs, copy `src/*/.env.example` to `src/*/.env.development` locally as needed.

## Identified Bottlenecks

| # | Bottleneck | Impact | Location |
|---|-----------|--------|----------|
| 1 | **Single PostgreSQL instance** | All 4 services share one Postgres container. A database failure takes down all services. | docker-compose.yaml — only one `postgres` service |
| 2 | **Single RabbitMQ node** | No clustering, mirroring, or quorum queues. Broker failure = total async failure. | `rabbitmq:management` image, no HA config |
| 3 | **Synchronous HTTP coupling in booking flow** | `CreateBookingHandler` makes 3 sequential synchronous HTTP calls (Flight, Passenger, Seat). Latency compounds; any downstream failure blocks the whole operation. | src/booking/src/booking/features/v1/create-booking/create-booking.ts |
| 4 | **Service URL configuration via env vars** | Service addresses are hardcoded/env-configured strings (no service discovery). | `FLIGHT_SERVICE_BASE_URL`, `PASSENGER_SERVICE_BASE_URL` in HTTP clients |
| 5 | **Global RabbitMQ channel singleton** | A module-level `let channel: amqp.Channel = null;` is reused across all publishers and consumers. Under high load, channel contention or a single channel error can cascade. | src/building-blocks/rabbitmq/rabbitmq-connection.ts |
| 6 | **No horizontal scaling** | Docker Compose `replicas` is not configured. Each service runs as exactly one container. | All service definitions in compose file |
| 7 | **Token validation on every request** | `JwtGuard` makes a synchronous HTTP call to Identity service on every authenticated request to validate the access token. | src/building-blocks/passport/jwt.guard.ts — `validateAccessToken()` |
