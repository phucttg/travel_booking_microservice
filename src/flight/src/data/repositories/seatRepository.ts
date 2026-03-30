import { randomUUID } from 'crypto';
import { EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Seat } from '@/seat/entities/seat.entity';
import { SeatClass } from '@/seat/enums/seat-class.enum';
import { SeatState } from '@/seat/enums/seat-state.enum';

export interface ISeatRepository {
  ensureSeatInventory(
    flightId: number,
    seats: Array<Pick<Seat, 'seatNumber' | 'seatClass' | 'seatType'>>,
    manager?: EntityManager
  ): Promise<number>;

  createSeat(seat: Seat): Promise<Seat>;

  reserveSeat(flightId: number, seatNumber: string, holdUntil?: Date | null): Promise<Seat | null>;

  reserveEconomySeat(flightId: number, holdUntil?: Date | null): Promise<Seat | null>;

  hasAvailablePremiumSeats(flightId: number): Promise<boolean>;

  releaseSeatByHoldToken(flightId: number, seatNumber: string, holdToken: string): Promise<Seat | null>;

  releaseSeatByBookingId(flightId: number, seatNumber: string, bookingId: number): Promise<Seat | null>;

  releaseLegacySeat(flightId: number, seatNumber: string): Promise<Seat | null>;

  commitSeat(flightId: number, seatNumber: string, holdToken: string, bookingId: number): Promise<Seat | null>;

  releaseExpiredHeldSeats(now?: Date): Promise<number>;

  countHeldSeats(): Promise<number>;

  countStuckHeldSeats(sweepMs: number, now?: Date): Promise<number>;

  getAll(): Promise<Seat[]>;

  getAvailableSeat(flightId: number, seatNumber: string): Promise<Seat>;

  getSeatsByFlightId(flightId: number): Promise<Seat[]>;

  getSeatsByFlightIdAll(flightId: number): Promise<Seat[]>;

  countSeatsByFlightId(flightId: number): Promise<number>;

  findSeatByFlightIdAndSeatNumber(flightId: number, seatNumber: string): Promise<Seat>;
}

export class SeatRepository implements ISeatRepository {
  constructor(
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>
  ) {}

  async ensureSeatInventory(
    flightId: number,
    seats: Array<Pick<Seat, 'seatNumber' | 'seatClass' | 'seatType'>>,
    manager?: EntityManager
  ): Promise<number> {
    if (!seats.length) {
      return 0;
    }

    const repository = manager?.getRepository(Seat) || this.seatRepository;

    const existingSeats = await repository
      .createQueryBuilder('seat')
      .select('seat.seatNumber', 'seatNumber')
      .where('seat.flightId = :flightId', { flightId })
      .getRawMany<{ seatNumber: string }>();

    const existingSeatNumbers = new Set(existingSeats.map((seat) => seat.seatNumber.toUpperCase()));
    const toInsert = seats
      .filter((seat) => !existingSeatNumbers.has(seat.seatNumber.toUpperCase()))
      .map((seat) => ({
        flightId,
        seatNumber: seat.seatNumber.toUpperCase(),
        seatClass: seat.seatClass,
        seatType: seat.seatType,
        isReserved: false,
        seatState: SeatState.AVAILABLE,
        createdAt: new Date()
      }));

    if (!toInsert.length) {
      return 0;
    }

    const insertResult = await repository
      .createQueryBuilder()
      .insert()
      .into(Seat)
      .values(toInsert)
      .orIgnore()
      .returning('id')
      .execute();

    return Array.isArray(insertResult.raw) ? insertResult.raw.length : insertResult.identifiers.length;
  }

  async createSeat(seat: Seat): Promise<Seat> {
    return await this.seatRepository.save(seat);
  }

  async reserveSeat(flightId: number, seatNumber: string, holdUntil?: Date | null): Promise<Seat | null> {
    const reserveValues = this.buildReserveValues(holdUntil);
    const reserveResult = await this.seatRepository
      .createQueryBuilder()
      .update(Seat)
      .set(reserveValues)
      .where('"flightId" = :flightId', { flightId })
      .andWhere('"seatNumber" = :seatNumber', { seatNumber })
      .andWhere(this.reclaimableSeatCondition(), {
        availableState: SeatState.AVAILABLE,
        heldState: SeatState.HELD
      })
      .returning('*')
      .execute();

    return this.mapRawSeat(reserveResult.raw?.[0]);
  }

  async reserveEconomySeat(flightId: number, holdUntil?: Date | null): Promise<Seat | null> {
    const sql = holdUntil ? this.reserveEconomySeatHoldSql() : this.reserveEconomySeatLegacySql();

    return await this.seatRepository.manager.transaction(async (entityManager) => {
      const params = holdUntil
        ? [
            flightId,
            String(SeatClass.ECONOMY),
            SeatState.AVAILABLE,
            SeatState.HELD,
            SeatState.HELD,
            true,
            randomUUID(),
            holdUntil
          ]
        : [flightId, String(SeatClass.ECONOMY), SeatState.AVAILABLE, SeatState.HELD, SeatState.BOOKED, true];
      const rawSeat = await entityManager.query(sql, params);

      return this.mapRawSeat(rawSeat?.[0]);
    });
  }

  async hasAvailablePremiumSeats(flightId: number): Promise<boolean> {
    const premiumCount = await this.seatRepository
      .createQueryBuilder('seat')
      .where('seat.flightId = :flightId', { flightId })
      .andWhere(this.reclaimableSeatCondition('seat'), {
        availableState: SeatState.AVAILABLE,
        heldState: SeatState.HELD
      })
      .andWhere('seat.seatClass IN (:...premiumSeatClasses)', {
        premiumSeatClasses: [String(SeatClass.FIRST_CLASS), String(SeatClass.BUSINESS)]
      })
      .getCount();

    return premiumCount > 0;
  }

  async releaseSeatByHoldToken(flightId: number, seatNumber: string, holdToken: string): Promise<Seat | null> {
    const releaseResult = await this.seatRepository
      .createQueryBuilder()
      .update(Seat)
      .set(this.availableSeatValues())
      .where('"flightId" = :flightId', { flightId })
      .andWhere('"seatNumber" = :seatNumber', { seatNumber })
      .andWhere('"seatState" = :heldState', { heldState: SeatState.HELD })
      .andWhere('"holdToken" = :holdToken', { holdToken })
      .returning('*')
      .execute();

    return this.mapRawSeat(releaseResult.raw?.[0]);
  }

  async releaseSeatByBookingId(flightId: number, seatNumber: string, bookingId: number): Promise<Seat | null> {
    const releaseResult = await this.seatRepository
      .createQueryBuilder()
      .update(Seat)
      .set(this.availableSeatValues())
      .where('"flightId" = :flightId', { flightId })
      .andWhere('"seatNumber" = :seatNumber', { seatNumber })
      .andWhere('"seatState" = :bookedState', { bookedState: SeatState.BOOKED })
      .andWhere('"reservedBookingId" = :bookingId', { bookingId })
      .returning('*')
      .execute();

    return this.mapRawSeat(releaseResult.raw?.[0]);
  }

  async releaseLegacySeat(flightId: number, seatNumber: string): Promise<Seat | null> {
    const releaseResult = await this.seatRepository
      .createQueryBuilder()
      .update(Seat)
      .set(this.availableSeatValues())
      .where('"flightId" = :flightId', { flightId })
      .andWhere('"seatNumber" = :seatNumber', { seatNumber })
      .andWhere('"seatState" = :bookedState', { bookedState: SeatState.BOOKED })
      .andWhere('"reservedBookingId" IS NULL')
      .returning('*')
      .execute();

    return this.mapRawSeat(releaseResult.raw?.[0]);
  }

  async commitSeat(flightId: number, seatNumber: string, holdToken: string, bookingId: number): Promise<Seat | null> {
    const commitResult = await this.seatRepository
      .createQueryBuilder()
      .update(Seat)
      .set({
        isReserved: true,
        seatState: SeatState.BOOKED,
        holdToken: null,
        holdExpiresAt: null,
        heldAt: null,
        reservedBookingId: bookingId,
        updatedAt: () => 'CURRENT_TIMESTAMP'
      })
      .where('"flightId" = :flightId', { flightId })
      .andWhere('"seatNumber" = :seatNumber', { seatNumber })
      .andWhere('"seatState" = :heldState', { heldState: SeatState.HELD })
      .andWhere('"holdToken" = :holdToken', { holdToken })
      .andWhere('"holdExpiresAt" > CURRENT_TIMESTAMP')
      .returning('*')
      .execute();

    const committedSeat = this.mapRawSeat(commitResult.raw?.[0]);
    if (committedSeat) {
      return committedSeat;
    }

    const existingSeat = await this.findSeatByFlightIdAndSeatNumber(flightId, seatNumber);
    if (existingSeat?.seatState === SeatState.BOOKED && existingSeat.reservedBookingId === bookingId) {
      return existingSeat;
    }

    return null;
  }

  async releaseExpiredHeldSeats(now = new Date()): Promise<number> {
    const releaseResult = await this.seatRepository
      .createQueryBuilder()
      .update(Seat)
      .set(this.availableSeatValues())
      .where('"seatState" = :heldState', { heldState: SeatState.HELD })
      .andWhere('"holdExpiresAt" IS NOT NULL')
      .andWhere('"holdExpiresAt" <= :now', { now })
      .returning('"id"')
      .execute();

    return Array.isArray(releaseResult.raw) ? releaseResult.raw.length : releaseResult.affected || 0;
  }

  async countHeldSeats(): Promise<number> {
    return await this.seatRepository.count({
      where: {
        seatState: SeatState.HELD
      }
    });
  }

  async countStuckHeldSeats(sweepMs: number, now = new Date()): Promise<number> {
    const stuckBefore = new Date(now.getTime() - sweepMs);

    return await this.seatRepository
      .createQueryBuilder('seat')
      .where('seat.seatState = :heldState', { heldState: SeatState.HELD })
      .andWhere('seat.holdExpiresAt IS NOT NULL')
      .andWhere('seat.holdExpiresAt <= :stuckBefore', { stuckBefore })
      .getCount();
  }

  async getAll(): Promise<Seat[]> {
    return await this.seatRepository.find();
  }

  async getAvailableSeat(flightId: number, seatNumber: string): Promise<Seat> {
    const seat = await this.seatRepository
      .createQueryBuilder('seat')
      .leftJoinAndSelect('seat.flight', 'flight')
      .where('flight.id = :flightId', { flightId })
      .andWhere('seat.seatNumber = :seatNumber', { seatNumber })
      .andWhere(this.reclaimableSeatCondition('seat'), {
        availableState: SeatState.AVAILABLE,
        heldState: SeatState.HELD
      })
      .getOne();

    return this.normalizeReclaimableSeat(seat);
  }

  async getSeatsByFlightId(flightId: number): Promise<Seat[]> {
    const list = await this.seatRepository
      .createQueryBuilder('seat')
      .leftJoinAndSelect('seat.flight', 'flight')
      .where('flight.id = :flightId', { flightId })
      .andWhere(this.reclaimableSeatCondition('seat'), {
        availableState: SeatState.AVAILABLE,
        heldState: SeatState.HELD
      })
      .getMany();

    return list.map((seat) => this.normalizeReclaimableSeat(seat));
  }

  async getSeatsByFlightIdAll(flightId: number): Promise<Seat[]> {
    return await this.seatRepository
      .createQueryBuilder('seat')
      .leftJoinAndSelect('seat.flight', 'flight')
      .where('flight.id = :flightId', { flightId })
      .getMany();
  }

  async countSeatsByFlightId(flightId: number): Promise<number> {
    return await this.seatRepository.countBy({ flightId });
  }

  async findSeatByFlightIdAndSeatNumber(flightId: number, seatNumber: string): Promise<Seat> {
    return await this.seatRepository
      .createQueryBuilder('seat')
      .leftJoinAndSelect('seat.flight', 'flight')
      .where('flight.id = :flightId', { flightId })
      .andWhere('seat.seatNumber = :seatNumber', { seatNumber })
      .getOne();
  }

  private reclaimableSeatCondition(alias = ''): string {
    const prefix = alias ? `${alias}.` : '';
    return `(${prefix}seatState = :availableState OR (${prefix}seatState = :heldState AND ${prefix}holdExpiresAt <= CURRENT_TIMESTAMP))`;
  }

  private availableSeatValues() {
    return {
      isReserved: false,
      seatState: SeatState.AVAILABLE,
      holdToken: null,
      holdExpiresAt: null,
      heldAt: null,
      reservedBookingId: null,
      updatedAt: () => 'CURRENT_TIMESTAMP'
    };
  }

  private buildReserveValues(holdUntil?: Date | null) {
    if (!holdUntil) {
      return {
        isReserved: true,
        seatState: SeatState.BOOKED,
        holdToken: null,
        holdExpiresAt: null,
        heldAt: null,
        reservedBookingId: null,
        updatedAt: () => 'CURRENT_TIMESTAMP'
      };
    }

    return {
      isReserved: true,
      seatState: SeatState.HELD,
      holdToken: randomUUID(),
      holdExpiresAt: holdUntil,
      heldAt: () => 'CURRENT_TIMESTAMP',
      reservedBookingId: null,
      updatedAt: () => 'CURRENT_TIMESTAMP'
    };
  }

  private reserveEconomySeatLegacySql(): string {
    return `
      WITH candidate AS (
        SELECT "id"
        FROM "seat"
        WHERE "flightId" = $1
          AND "seatClass" = $2
          AND ("seatState" = $3 OR ("seatState" = $4 AND "holdExpiresAt" <= CURRENT_TIMESTAMP))
        ORDER BY "seatNumber" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE "seat"
      SET "seatState" = $5,
          "isReserved" = $6,
          "holdToken" = NULL,
          "holdExpiresAt" = NULL,
          "heldAt" = NULL,
          "reservedBookingId" = NULL,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" IN (SELECT "id" FROM candidate)
      RETURNING *
    `;
  }

  private reserveEconomySeatHoldSql(): string {
    return `
      WITH candidate AS (
        SELECT "id"
        FROM "seat"
        WHERE "flightId" = $1
          AND "seatClass" = $2
          AND ("seatState" = $3 OR ("seatState" = $4 AND "holdExpiresAt" <= CURRENT_TIMESTAMP))
        ORDER BY "seatNumber" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE "seat"
      SET "seatState" = $5,
          "isReserved" = $6,
          "holdToken" = $7,
          "holdExpiresAt" = $8,
          "heldAt" = CURRENT_TIMESTAMP,
          "reservedBookingId" = NULL,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" IN (SELECT "id" FROM candidate)
      RETURNING *
    `;
  }

  private normalizeReclaimableSeat(seat?: Seat | null): Seat | null {
    if (!seat) {
      return null;
    }

    if (!this.isExpiredHold(seat)) {
      return seat;
    }

    return this.seatRepository.create({
      ...seat,
      isReserved: false,
      seatState: SeatState.AVAILABLE,
      holdToken: null,
      holdExpiresAt: null,
      heldAt: null,
      reservedBookingId: null
    });
  }

  private isExpiredHold(seat?: Partial<Seat> | null): boolean {
    if (!seat || seat.seatState !== SeatState.HELD || !seat.holdExpiresAt) {
      return false;
    }

    return new Date(seat.holdExpiresAt).getTime() <= Date.now();
  }

  private mapRawSeat(rawSeat?: Partial<Seat> | null): Seat | null {
    if (!rawSeat) {
      return null;
    }

    return this.seatRepository.create({
      ...rawSeat,
      id: Number(rawSeat.id),
      flightId: Number(rawSeat.flightId),
      seatClass: Number(rawSeat.seatClass),
      seatType: Number(rawSeat.seatType),
      seatState: Number(rawSeat.seatState),
      reservedBookingId:
        typeof rawSeat.reservedBookingId === 'number' || typeof rawSeat.reservedBookingId === 'string'
          ? Number(rawSeat.reservedBookingId)
          : null,
      isReserved: Boolean(rawSeat.isReserved),
      holdToken: rawSeat.holdToken ?? null,
      holdExpiresAt: rawSeat.holdExpiresAt ? new Date(rawSeat.holdExpiresAt) : null,
      heldAt: rawSeat.heldAt ? new Date(rawSeat.heldAt) : null,
      createdAt: rawSeat.createdAt ? new Date(rawSeat.createdAt) : new Date(),
      updatedAt: rawSeat.updatedAt ? new Date(rawSeat.updatedAt) : null
    });
  }
}
