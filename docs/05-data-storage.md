# 5. Data Storage

## Databases, ORMs, and Configuration

| Component | Technology | Configuration |
|-----------|------------|---------------|
| **RDBMS** | PostgreSQL 16 | deployments/docker-compose/docker-compose.yaml |
| **ORM** | TypeORM | Each service's `data-source.ts` (e.g., src/booking/src/data/data-source.ts) |
| **Config Validation** | Joi schema | src/building-blocks/configs/configs.ts |
| **RDS Support** | AWS RDS override | deployments/docker-compose/docker-compose.rds.yaml |

## Core Data Models

```typescript
// ─── Identity Service ───────────────────────────────
// src/identity/src/user/entities/user.entity.ts
@Entity()
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column() email: string;
  @Column() password: string;      // bcrypt hashed
  @Column() name: string;
  @Column() passportNumber: string;
  @Column() age: number;
  @Column({ type: 'enum', enum: Role }) role: Role;               // USER=0, ADMIN=1
  @Column({ type: 'enum', enum: PassengerType }) passengerType: PassengerType;
  @Column({ default: false }) isEmailVerified: boolean;
  @Column() createdAt: Date;
  @Column({ nullable: true }) updatedAt?: Date;
}

@Entity()
export class Token {
  @PrimaryGeneratedColumn() id: number;
  @Column() token: string;
  @Column() refreshToken: string;
  @Column() userId: number;
  @Column({ type: 'enum', enum: TokenType }) type: TokenType;     // ACCESS=0, REFRESH=1
  @Column() expires: Date;
  @Column({ default: false }) blacklisted: boolean;
  @Column() createdAt: Date;
}

// ─── Flight Service ─────────────────────────────────
// src/flight/src/flight/entities/flight.entity.ts
@Entity()
export class Flight {
  @PrimaryGeneratedColumn() id: number;
  @Column() flightNumber: string;
  @Column() price: number;
  @Column({ type: 'enum', enum: FlightStatus }) flightStatus: FlightStatus;
  @Column() flightDate: Date;
  @Column() departureDate: Date;
  @Column() departureAirportId: number;
  @Column() aircraftId: number;
  @Column() arriveDate: Date;
  @Column() arriveAirportId: number;
  @Column() durationMinutes: number;
}

@Entity()
export class Seat {
  @PrimaryGeneratedColumn() id: number;
  @Column() seatNumber: string;
  @Column({ type: 'enum', enum: SeatClass }) seatClass: SeatClass;
  @Column({ type: 'enum', enum: SeatType }) seatType: SeatType;
  @Column() flightId: number;
  @Column({ default: false }) isReserved: boolean;
}

// ─── Passenger Service ──────────────────────────────
// src/passenger/src/passenger/entities/passenger.entity.ts
@Entity()
export class Passenger {
  @PrimaryGeneratedColumn() id: number;
  @Column() userId: number;
  @Column() name: string;
  @Column() passportNumber: string;
  @Column() age: number;
  @Column({ type: 'enum', enum: PassengerType }) passengerType: PassengerType;
}

// ─── Booking Service ────────────────────────────────
// src/booking/src/booking/entities/booking.entity.ts
@Entity()
export class Booking {
  @PrimaryGeneratedColumn() id: number;
  @Column() flightNumber: string;
  @Column({ nullable: true }) flightId?: number;
  @Column() aircraftId: number;
  @Column() departureAirportId: number;
  @Column() arriveAirportId: number;
  @Column() flightDate: Date;
  @Column() price: number;
  @Column() description: string;
  @Column() seatNumber: string;
  @Column() passengerName: string;
  @Column({ nullable: true }) userId?: number;
  @Column({ nullable: true }) passengerId?: number;
  @Column({ type: 'enum', enum: BookingStatus }) bookingStatus: BookingStatus;
  @Column({ nullable: true }) canceledAt?: Date;
}
```

## Persistence Strategy

| Aspect | Strategy |
|--------|----------|
| **Schema Management** | TypeORM `synchronize` mode (configurable via `POSTGRES_SYNCHRONIZE` env var) |
| **Migrations** | Supported via TypeORM DataSource config (`POSTGRES_MIGRATIONS`, `POSTGRES_MIGRATIONS_RUN`) |
| **Seeding** | `DataSeeder` classes in Identity and Flight services, run on bootstrap via `OnApplicationBootstrap` |
| **ACID** | PostgreSQL default transaction isolation; individual entity saves (not explicit multi-table transactions) |
| **SSL** | Configurable via `POSTGRES_SSL` and `POSTGRES_SSL_REJECT_UNAUTHORIZED` |
