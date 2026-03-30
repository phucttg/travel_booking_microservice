# Passenger Sync Repair Runbook

Use this runbook when booking shows `Passenger not found` because a `UserCreated` event was rejected and the passenger profile was never created.

## 1. Check the dead-letter queue

```bash
docker exec rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged | rg 'passenger service.user_created(\\.dlq)?'
```

Expected:

- `passenger service.user_created` should normally be `0 0`
- `passenger service.user_created.dlq` greater than `0` means at least one `UserCreated` event was rejected

## 2. Republish a sanitized event for one user

Run from [`src/identity`](/Users/truongphuc/Desktop/travel_booking/travel_booking_microservice/src/identity):

```bash
NODE_ENV=docker POSTGRES_HOST=localhost RABBITMQ_Host=localhost npm run repair:passenger-sync -- --userId=5
```

Replace `5` with the target identity user id.

## 3. Republish sanitized events for all users

Run from [`src/identity`](/Users/truongphuc/Desktop/travel_booking/travel_booking_microservice/src/identity):

```bash
NODE_ENV=docker POSTGRES_HOST=localhost RABBITMQ_Host=localhost npm run repair:passenger-sync -- --all
```

This is safe to rerun because the passenger consumer skips duplicate `userId` values.

## 4. Verify passenger profile creation

```bash
docker exec postgres psql -U postgres -d passenger -c 'select id, "userId", name, "passportNumber", age, "passengerType", "createdAt" from passenger where "userId" = 5;'
```

If the row exists, the passenger profile has been repaired successfully.

## 5. Verify the booking flow symptom is gone

- Log in as the affected user
- Open `/bookings/create`
- Go to the review step
- Confirm the passenger profile is shown instead of the `404` message

## 6. Clean up the stale DLQ message

The original malformed message will remain in `passenger service.user_created.dlq` until it is purged manually. Do not replay the raw DLQ payload because it still contains the invalid shape.
