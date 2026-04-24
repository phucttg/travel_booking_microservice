# 6. 21-22 Minute GitHub Video Voiceover Script

This guide turns the repository walkthrough plan into a concrete recording script you can follow directly while capturing the video.

## Recording Goal

The grading emphasis for this repository should be framed as:

1. local development
2. container code
3. YAML code
4. functionality and deep service behavior as supporting proof

The core message to repeat throughout the video is:

> This repository is strongest in local bootstrap, container engineering, and operational YAML, and those choices directly support the microservice workflow in booking, payment, and flight.

Target voiceover duration: `21:00-22:00`.

Expected final video duration: `22:00-24:00` after screen transitions, cursor pauses, and short moments where code or diagrams stay visible.

## Pacing Rule

Read at a calm technical walkthrough pace. If a screen transition, browser tab, or file search takes longer than expected, pause naturally and let the screen catch up instead of reading faster. The table timings are screen-walkthrough anchors, while the voiceover itself is written to safely exceed 20 minutes.

## Pre-Record Checklist

### 1. Start the stack before recording

Do not start containers on camera. Start them first, verify health, then begin the video.

Recommended command:

```bash
bash deployments/scripts/dev-up.sh --observability
```

Then verify:

```bash
docker compose -f deployments/docker-compose/docker-compose.yaml ps
make wallet-proxy-smoke
```

Optional:

```bash
BASE_URL=http://localhost \
SMOKE_USER_EMAIL=dev@dev.com \
SMOKE_USER_PASSWORD=Admin@12345 \
bash deployments/scripts/api-smoke.sh
```

### 2. Prepare the IDE tabs

Pin these tabs in this exact order so the recording flow is smooth:

1. `README.md`
2. `deployments/scripts/dev-up.sh`
3. `deployments/docker-compose/docker-compose.yaml`
4. `deployments/docker-compose/docker-compose.observability.yaml`
5. `src/booking/Dockerfile`
6. `src/frontend/Dockerfile`
7. `src/frontend/nginx.conf`
8. `deployments/configs/otel-collector-config.yaml`
9. `deployments/configs/prometheus.yaml`
10. `.github/workflows/pr-ci.yml`
11. `.github/workflows/main-build-release.yml`
12. `.github/workflows/deploy-staging.yml`
13. `docs/evidence/15-aws-architecture-diagram.png`
14. `src/frontend/src/App.tsx`
15. `src/booking/src/main.ts`
16. `src/booking/src/booking/features/v1/create-booking/create-booking.ts`
17. `src/booking/src/booking/http-client/services/flight/flight.client.ts`
18. `src/booking/src/booking/http-client/services/passenger/passenger-client.ts`
19. `src/booking/src/booking/http-client/services/payment/payment.client.ts`
20. `src/payment/src/payment/features/v1/confirm-payment/confirm-payment.ts`
21. `src/flight/src/seat/features/v1/reserve-seat/reserve-seat.ts`
22. `src/payment/src/payment/scheduler/payment-expiry.scheduler.ts`
23. `src/booking/src/booking/consumers/payment-succeeded.consumer.ts`
24. `src/booking/src/booking/services/booking-seat-commit-reconciler.service.ts`

### 3. Prepare the terminals

Use two terminals.

Terminal A:

- keep the successful `dev-up.sh --observability` output visible
- if the scrollback is noisy, keep the last healthy part visible instead of replaying logs

Terminal B:

- `docker compose -f deployments/docker-compose/docker-compose.yaml ps`
- `make wallet-proxy-smoke`
- optional `BASE_URL=http://localhost SMOKE_USER_EMAIL=dev@dev.com SMOKE_USER_PASSWORD=Admin@12345 bash deployments/scripts/api-smoke.sh`

### 4. Prepare the browser tabs

Recommended tabs:

1. `http://localhost/login`
2. `http://localhost:15672` for RabbitMQ management
3. `http://localhost:3000` for Grafana if observability is running
4. the repository GitHub Actions page or the local evidence pack in `docs/evidence`
5. optional AWS Console or AWS evidence screenshots for `Name.com`, `CloudFront`, `ALB`, `ECR`, `ECS healthy services`, and `RDS`

Also keep `docs/evidence/15-aws-architecture-diagram.png` open in Preview or the editor image viewer. It is a required on-screen artifact in the AWS section, not optional supporting evidence.

Credentials you can mention if needed:

- RabbitMQ: `guest / guest`
- Grafana: `admin / admin`

### 5. Important local caveat

Do not promise a host-browser demo of backend Swagger pages during local Docker Compose.

The backend services in `deployments/docker-compose/docker-compose.yaml` use `expose`, not host `ports`, so they are reachable inside the Docker network but are not published directly to the host browser. In the video, explain `/swagger`, `/metrics`, and `/health/*` from code and health checks unless you intentionally changed the compose setup before recording.

## Accuracy Rules

These statements must stay accurate in the video:

- This repo is strong in Docker Compose, observability YAML, and GitHub Actions YAML.
- This repo is not a Kubernetes or Helm-heavy repository.
- Manual payment reconcile exists as a backend API at `POST /api/v1/payment/reconcile-manual`.
- The current admin frontend page at `/payments/reconcile` is actually a wallet top-up review screen, not a dedicated manual payment reconcile form.
- This repo uses `manual bootstrap first, then CI/CD for updates`.
- `deploy-staging` updates existing ECS services and task definitions rather than creating the whole runtime from zero.
- `rabbitmq` should be described as a runtime dependency or manually bootstrapped service, not as one of the six app images built from this repository.
- When the AWS diagram is on screen, explain it in two passes: traffic path first, deployment path second.
- The frontend sits on the public-facing path through CloudFront and the ALB, while the backend services, RabbitMQ, and RDS sit behind that path in private subnet space.

Do not overclaim:

- do not say the repo deploys with Kubernetes
- do not say the frontend exposes every backend operational endpoint
- do not say manual payment reconcile already has a dedicated browser workflow
- do not say GitHub Actions provisions the full ECS runtime from zero on the first deploy
- do not imply the ECS runtime environment matrix exists as one committed repo file if it was defined manually for deployment

## Booking Narration Guardrails

Use this framing so the booking section sounds like a normal checkout flow:

- describe booking create as validating the checkout request, loading flight and traveler context, reserving inventory, creating a pending booking, and opening the payment step
- keep duplicate-flow guardrails as a background implementation detail, not the headline behavior
- if you need one defensive sentence, use: “There are guardrails here to keep checkout state clean and prevent duplicate in-flight payment flows.”

Do not say these phrases on camera:

- `one passenger only books one ticket`
- `one user only has one booking`
- `one passenger profile per user`
- `active booking already exists`
- `getPassengerByUserId`

## 22-24 Minute Run of Show

| Time | Where to show | What to do on screen | Talk track |
| --- | --- | --- | --- |
| 0:00-1:00 | `README.md` and file explorer | Open the repo root and keep the tree visible on the left. | “This repository is a cloud-native travel booking microservice platform. On screen I am starting from the root because the structure already shows the main story: a React frontend, five backend services, shared building blocks, deployment assets, and evidence. In this walkthrough I will not just list features. I will focus on the engineering areas that are strongest for grading: local bootstrap, container code, operational YAML, and then the service behavior that proves those platform choices support a real booking workflow.” |
| 1:00-2:15 | `README.md` local development section | Scroll to the local development commands only. Do not read the whole README. | “The first thing I want to show is local development, because this is where a microservice repository either becomes usable or becomes painful. The README gives a single developer path instead of asking someone to start identity, flight, passenger, booking, payment, frontend, database, cache, and messaging one by one. That matters because repeatability is part of the implementation quality. If another developer can bring up the same stack with documented commands and smoke checks, then the repository is not just a collection of services. It is an environment that can be tested and reviewed consistently. I am deliberately not reading every capability bullet here, because the goal of this first section is to prove that the project has a reliable entrypoint before I talk about business behavior.” |
| 2:15-3:30 | `deployments/scripts/dev-up.sh` | Highlight `--rds`, `--observability`, env generation, and default compose command. | “This script is the local entrypoint behind that README command. I am highlighting it because it explains why the bootstrap is repeatable. It creates missing `.env.docker` files from committed templates, so local configuration is materialized in a predictable way. It can also add an RDS-style overlay or an observability overlay without changing the base command shape. If no extra Docker Compose arguments are passed, it defaults to `up -d --build`, so the common path stays short. The important point is that local setup is encoded as code, not as hidden manual steps. This reduces onboarding risk: a reviewer can inspect exactly how compose files are selected, how env files are generated, and how optional runtime modes are activated.” |
| 3:30-4:45 | `src/booking/.env.docker.example` then `src/payment/.env.docker.example` | Point at service name, port, database, RabbitMQ, and service URLs. | “Before I show the full runtime wiring, I want to pause on the service environment templates. These files make the service boundaries visible before any container starts. Booking has its own port, database name, RabbitMQ exchange, and downstream service URLs, because booking is the orchestration service for checkout. Payment has its own database and payment-specific settings, including expiry and transfer-reconciliation configuration, because it owns payment lifecycle behavior. This is why the configuration is not one giant shared env file. Each service carries the settings that match its responsibility, and the compose layer can wire those responsibilities together. Later, when I open the checkout handler, these URLs will explain why booking can call flight, passenger, and payment without hardcoding local host addresses into the code.” |
| 4:45-6:00 | Terminal B and `deployments/docker-compose/docker-compose.yaml` | First show `docker compose ... ps`, then switch to compose file and point at `postgres`, `rabbitmq`, `redis`, backend services, and `frontend`. | “Now I am connecting the bootstrap script to the actual runtime. The `docker compose ps` output proves the stack is up, and the compose file shows what the stack contains. It brings up PostgreSQL for persistence, RabbitMQ for asynchronous events, Redis for rate limiting, five backend services, and the frontend nginx container. The backend services use health checks, and the frontend waits for those services to become healthy before it starts serving the user path. That is a stronger design than blind startup order, because it makes local behavior closer to an operational environment. Notice also that backend services are exposed inside the Docker network, while the frontend publishes the browser entrypoint. That matches the later architecture story: users enter through one public path, and services communicate behind it.” |
| 6:00-7:15 | `deployments/docker-compose/docker-compose.observability.yaml` and browser Grafana tab | Show overlay services in code, then briefly show Grafana if available. | “The next decision is that observability is an overlay instead of being forced into the base stack. On screen, this file adds Prometheus, Tempo, Loki, Grafana, and the OpenTelemetry collector only when I ask for observability. That keeps the default developer loop lighter, while still giving a complete telemetry stack when I need to inspect traces, metrics, and logs. This is an important local development choice because it separates the core application runtime from optional diagnostic infrastructure, but keeps both paths versioned in the repository. It also makes the demo safer: if Grafana is slow, the YAML still proves what would run, and the base app stack can continue without waiting for every observability container.” |
| 7:15-8:00 | Browser RabbitMQ tab | Show RabbitMQ management quickly. | “I am only showing RabbitMQ briefly here, because the detailed event flow comes later. At this point the reason to open it is to prove that asynchronous infrastructure is not just a diagram. It is part of the local stack. RabbitMQ is needed because some workflow transitions should not be tightly coupled to a synchronous HTTP request. Later, when payment succeeds or expires, and when a seat needs to be committed or released, this messaging layer is what lets services react without turning every operation into one large blocking transaction. That is the bridge from local infrastructure to the service behavior section near the end.” |
| 8:00-10:15 | `src/booking/Dockerfile` | Briefly show the file explorer with the other backend Dockerfiles, then walk through the booking builder stage, prod dependency stages, copied shared runtime, and distroless runner. | “The second major strength is container code, and I am using the booking Dockerfile as the detailed backend example. Before zooming in, notice that identity, flight, passenger, booking, and payment each have their own Dockerfile, and the backend services follow the same multi-stage container pattern. I am showing one backend deeply because the container mechanics repeat, while the service code changes by domain. This booking file shows the pattern clearly. It first installs and builds the shared `building-blocks` package, then builds the service, then prepares production-only dependencies, then copies the runtime pieces that are actually needed. The final runner uses a distroless Node image as a non-root user. That matters for grading because it shows the repository treats containers as production artifacts. It reduces runtime surface area, separates build-time dependencies from runtime dependencies, and still preserves the shared package that all backend services depend on. This is why the later CI workflow can validate backend Docker images with confidence instead of treating Docker as an afterthought.” |
| 10:15-11:30 | `src/frontend/Dockerfile` and `src/frontend/nginx.conf` | Show the frontend build stage, then the nginx routes and rate limits. | “The frontend container is intentionally different from the backend containers. Vite builds static assets first, then nginx serves the compiled single-page application. Nginx also acts as the browser-facing reverse proxy, so the user does not need to know the internal service ports. The route families under `/api/v1` are forwarded to identity, flight, passenger, booking, or payment depending on the path. This file also applies rate limiting before traffic reaches application code. That means the frontend container is not just a static file server. It is the public entrypoint that organizes browser traffic into the microservice backend. It also explains why I avoid promising direct browser access to backend Swagger pages in local compose: nginx exposes the application path, while backend operational endpoints remain service-local unless deliberately published.” |
| 11:30-12:45 | `deployments/configs/otel-collector-config.yaml` | Point at receivers, processors, exporters, and pipelines. | “Now I am moving from container code to operational YAML. The OpenTelemetry collector configuration is a good example because it defines a telemetry pipeline instead of leaving observability as an application afterthought. The receivers accept OTLP data, processors batch or transform it, and exporters send telemetry to systems like Tempo, Loki, Prometheus, or the debug output. This is not a Kubernetes or Helm section; the value is that telemetry wiring is explicit, inspectable, and versioned with the app. In other words, the repo shows how signals move from services into the tools used during debugging. The separate traces, metrics, and logs pipelines also make the intent readable on screen, which is useful in a recorded assessment because the YAML explains the operational design without needing a live incident.” |
| 12:45-13:45 | `deployments/configs/prometheus.yaml` | Highlight scrape jobs and collector integration. | “Prometheus continues that same operational story. I am showing this file because it proves metrics collection is structured around the collector instead of every service being hardcoded directly into Prometheus. Prometheus scrapes collector endpoints and its own endpoint, while the collector receives metrics from instrumented services. That separation gives a cleaner telemetry path. It also makes the observability stack easier to evolve, because the services can emit telemetry through OpenTelemetry and the collector can decide where those metrics should go. This is why I describe the repo’s YAML strength as operational YAML rather than just deployment YAML.” |
| 13:45-15:00 | `.github/workflows/pr-ci.yml` then `main-build-release.yml` | Show changed-service detection, build/test steps, Docker validation, then release build and image push. | “YAML also drives CI and release automation. In PR CI, the workflow first detects which parts of the repository changed, then runs targeted backend builds and tests, validates backend Docker images, validates compose variants, and runs frontend build, tests, and a browser smoke check. That keeps CI focused instead of rebuilding everything blindly. The release workflow then takes the changed services, builds images, pushes them to ECR, and writes a release manifest. So the YAML story is consistent across the repo: local runtime, observability, CI validation, and release automation are all defined as versioned operational code. I am careful to say backend Docker validation here, because the frontend job is build and smoke focused, while the release workflow is where changed images are built for deployment.” |
| 15:00-16:00 | `docs/evidence/15-aws-architecture-diagram.png` | Start with the diagram full-screen and trace the whole public traffic path; do not zoom into WAF unless it is clearly visible. | “Now that the update pipeline is clear, I want to show where these containers actually run. This diagram is not a guess; it is backed by the evidence screenshots in `docs/evidence`, and I use it in two passes. The live traffic path starts with users reaching the custom domain managed in Name.com, then traffic enters CloudFront, and the diagram also shows WAF or security protection at the edge. The main path then continues to the internet-facing ALB. From there the public entrypoint reaches the frontend ECS service, and frontend nginx proxies API traffic to the backend ECS services. Those backend services depend on RabbitMQ for asynchronous messaging and one RDS PostgreSQL instance split into five logical databases. I am explaining traffic first because it is the easiest way to understand why the frontend is the public entrypoint and why the backend services can stay behind it.” |
| 16:00-16:45 | `docs/evidence/15-aws-architecture-diagram.png` | Keep the diagram open and point at the subnet labels, Internet Gateway, and NAT Gateway icons. | “The placement is also part of the architecture. The frontend sits on the public-facing path through CloudFront and the ALB, while backend services, RabbitMQ, and RDS sit behind that path in private subnet space. The Internet Gateway belongs to the ingress side, and the NAT Gateway represents controlled outbound connectivity for private workloads when needed. So this diagram is not decorative. It explains why public traffic has one controlled entrypoint and why the backend dependencies are not exposed directly to the browser.” |
| 16:45-17:15 | `docs/evidence/15-aws-architecture-diagram.png`, then `main-build-release.yml` and `deploy-staging.yml` | Finish on the bottom path of the diagram, then switch to the workflow files. | “The AWS environment is already bootstrapped and running. From there, the repository’s CI/CD pipeline handles real application deployment: it builds images, pushes them to ECR, registers new ECS task definition revisions, updates the existing ECS services, and runs smoke checks. So the honest deployment claim is a working bootstrap-to-CI/CD model: the runtime exists, and the repo automates the repeatable application release path on top of it. That wording matters because the deployed system is real today, while the repo’s automation is focused on application releases instead of rebuilding the surrounding cloud foundation on every run.” |
| 17:15-17:45 | `main-build-release.yml`, `deploy-staging.yml`, and `docs/evidence/README.md` | Show the workflow files first, then use the evidence index or screenshots in this order: DNS/Name.com, CloudFront, ALB origin, ECR, ECS healthy services, RDS. | “Once the runtime is in place, the GitHub workflows become the update mechanism. `main-build-release` maps to the bottom deployment path by building and pushing images into ECR and publishing a release manifest. `deploy-staging` then reads that manifest, runs migrations for the changed backend services, registers new task definition revisions, and updates existing ECS services. I am using the evidence index here so the proof is visible and ordered. The screenshots support the handoff in sequence: DNS and Name.com point to CloudFront, CloudFront points to the ALB origin, ECR stores the images, ECS shows healthy services, and RDS shows the database runtime.” |
| 17:45-18:45 | `src/frontend/src/App.tsx`, `src/frontend/nginx.conf`, and one backend `main.ts` | Show routed frontend pages, then proxy families, then a backend `main.ts` with `/swagger`, `/metrics`, and health registration. | “Now I am bringing the infrastructure story back to the application. `App.tsx` shows the browser routes that users and admins can reach. Nginx shows how those browser requests are routed to backend service families. A backend `main.ts` shows that each service registers Swagger, metrics, and health endpoints inside its own process. In local Docker Compose those backend ports are exposed inside the Docker network, not directly as host browser pages. At this point the platform story is clear, so I can open the booking flow to show what this infrastructure is actually supporting. This transition matters: without the domain flow, containers and YAML would be technically neat but disconnected from the business problem.” |
| 18:45-20:45 | `src/booking/src/booking/features/v1/create-booking/create-booking.ts`, then briefly `flight.client.ts`, `passenger-client.ts`, and `payment.client.ts` | Keep `create-booking.ts` as the anchor, point first at idempotency handling, then the payment window and hold timing, then the booking creation fields and payment linkage. If you open `passenger-client.ts`, describe it only as traveler-information lookup. Do not pause on the duplicate-booking branch or zoom into `getPassengerByUserId(...)`. | “The deepest service behavior starts in booking create, and I want to read it as a timeline. First, the handler validates the authenticated checkout request and requires an idempotency key, so repeated submits can be handled safely. Then it loads flight context from the flight service and traveler context from the passenger service, because booking needs a stable snapshot before it creates a checkout. It calculates the payment window, extends the seat hold slightly beyond that window, and asks flight to reserve the seat with price and hold details. After that, booking creates a pending booking with locked price, seat, passenger, and flight fields. Once the booking row exists, it opens the payment step through the payment service and saves the payment linkage back on the booking. The client files beside this handler are proof of the service boundary: booking calls flight for inventory, passenger for traveler information, and payment for payment intent state. That makes the user action look simple while the backend coordinates several service-owned states in a fixed order. So this is the creation phase: booking coordinates checkout first, payment confirmation happens later, and asynchronous consumers handle convergence after the request has returned.” |
| 20:45-22:00 | `src/payment/src/payment/features/v1/confirm-payment/confirm-payment.ts` and `src/flight/src/seat/features/v1/reserve-seat/reserve-seat.ts` | Start on payment confirm to show admin-only payment finalization and idempotency, then open reserve-seat to connect it back to the earlier checkout hold and price-lock logic. | “Payment confirmation is a later phase, not the same moment as checkout creation. This handler is admin-only and idempotent, so manual confirmation can be retried safely with the same key. Depending on the scenario, it records attempts and moves the payment into succeeded, failed, processing, or expired behavior. The inventory hold was created earlier through `reserve-seat`, and that flight handler is where seat-aware pricing, hold token, and hold expiry are produced. Showing these files together connects commercial state and inventory state without pretending they happen at exactly the same time. The reason this matters is that payment success should not simply mark a row paid and ignore inventory. It needs to feed the event-driven follow-up that turns a held seat into a committed booked seat.” |
| 22:00-23:00 | `src/payment/src/payment/scheduler/payment-expiry.scheduler.ts`, `src/booking/src/booking/consumers/payment-succeeded.consumer.ts`, and `src/booking/src/booking/services/booking-seat-commit-reconciler.service.ts` | Show expiry scheduler, payment success consumer, then seat commit reconciler. | “The final service-depth section is about consistency after the request returns. Payment expiry is scheduled in the payment service, and expired payments are written as outbox events. When payment succeeds, booking consumes that event asynchronously, confirms the booking, emits booking-created behavior, and requests the seat commit if a hold token exists. The reconciler is the safety net. It checks whether the held seat actually became a committed booked seat, retries the commit if the hold is still valid, and cancels with refund handling if the inventory state can no longer be reconciled. This is what makes the workflow feel like a real microservice system. It shows the repository is not only exposing endpoints; it also handles delayed outcomes, duplicate messages, and recovery paths after the original checkout request has finished. That is why this section is the proof behind the earlier RabbitMQ and outbox discussion.” |
| 23:00-23:30 | Terminal B, evidence screenshots, or GitHub Actions page | Show smoke command, compose health, and CI or AWS proof. | “To make the walkthrough verifiable, I end by showing executable proof rather than only code. The compose health output shows the local stack is alive. The wallet proxy smoke command checks that the browser entrypoint reaches the payment wallet routes through nginx. CI evidence shows automated validation, and the AWS evidence shows that the deployed runtime exists. These artifacts matter because they turn the architecture claims into something the reviewer can inspect instead of just trusting the narration.” |
| 23:30-24:00 | `README.md` or repo tree | Return to the repo root and stop scrolling. | “My final assessment is that this repository is strongest in local bootstrap, container engineering, and operational YAML. It is honest about deployment: manual bootstrap establishes the AWS runtime, and CI/CD keeps existing services updated. Those platform strengths are backed by meaningful booking, payment, and flight behavior, including checkout orchestration, payment lifecycle handling, seat holds, events, and reconciliation. That combination makes the architecture credible rather than theoretical, because the infrastructure choices are tied directly to the workflow they support. So the final takeaway is not that every possible cloud feature is implemented. The takeaway is that the implemented pieces are coherent, testable, and connected from local development all the way to the deployed booking workflow.” |

## Fallback Decisions During Recording

Use these defaults if something is not available during the session:

- If Grafana is not ready, stay on `docker-compose.observability.yaml` and the OTEL or Prometheus config instead of waiting.
- If GitHub Actions is not accessible in the browser, open the screenshots in `docs/evidence/06-github-actions-success.png` through `09-github-actions-success.png`.
- If AWS Console is not accessible during recording, use `docs/evidence/03-namecom-dns-mapping.png`, `04-cloudfront-alt-domains.png`, `05-cloudfront-origin-alb.png`, `06-cloudfront-security-alb.png`, `10-ecs-services-healthy.png`, `11-ecr-repositories.png`, and `12-rds-instance.png`.
- If you do not have a local authenticated user ready, stay on the login page and keep the service-depth explanation code-first instead of attempting a live booking flow.
- If RabbitMQ or Grafana login screens are slow, do not retry repeatedly on camera; switch back to YAML and continue the explanation.

## Final Delivery Tips

- Keep the mouse still when making a point. Move only when switching files or highlighting a new block.
- Zoom the editor enough that function names, routes, and Docker stages are readable without pausing.
- Do not read code line by line. Summarize the intent of each block.
- Spend more time on `dev-up.sh`, Dockerfiles, Compose, observability YAML, and GitHub Actions than on secondary domain features.
- In the AWS segment, explain the architecture diagram in two passes: traffic path first, deployment path second.
- In the AWS segment, be explicit that first-time deploy required manual bootstrap before CI/CD became useful.
- Keep the business-depth section centered on `booking`, `payment`, and `flight`. That is the most convincing trio in this codebase.
- Keep the early `README.md` segment constrained to local setup only. Do not scroll into the booking capability bullets during recording.
- In `create-booking.ts`, keep the cursor on idempotency, hold timing, booking creation, and payment linkage. Do not linger on `getPassengerByUserId(...)`, duplicate-booking guards, or `ACTIVE_BOOKING_EXISTS`.

## One-Sentence Close

Use this as the final sentence if you want a clean ending:

> This repository is technically strongest in local bootstrap, containerization, and operational YAML, and it combines those strengths with a realistic AWS bootstrap-to-CI/CD deployment model to support a credible event-driven booking workflow across multiple services.
