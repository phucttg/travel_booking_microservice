import { EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Seat } from '@/seat/entities/seat.entity';

export interface ISeatRepository {
  ensureSeatInventory(
    flightId: number,
    seats: Array<Pick<Seat, 'seatNumber' | 'seatClass' | 'seatType'>>,
    manager?: EntityManager
  ): Promise<number>;

  createSeat(seat: Seat): Promise<Seat>;

  reserveSeat(flightId: number, seatNumber?: string): Promise<Seat>;

  releaseSeat(flightId: number, seatNumber: string): Promise<Seat>;

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

  async reserveSeat(flightId: number, seatNumber?: string): Promise<Seat> {
    if (seatNumber) {
      const reserveResult = await this.seatRepository
        .createQueryBuilder()
        .update(Seat)
        .set({
          isReserved: true,
          updatedAt: () => 'CURRENT_TIMESTAMP'
        })
        .where('"flightId" = :flightId', { flightId })
        .andWhere('"seatNumber" = :seatNumber', { seatNumber })
        .andWhere('"isReserved" = false')
        .returning('*')
        .execute();

      return this.mapRawSeat(reserveResult.raw?.[0]);
    }

    return await this.seatRepository.manager.transaction(async (entityManager) => {
      const rawSeat = await entityManager.query(
        `
          WITH candidate AS (
            SELECT "id"
            FROM "seat"
            WHERE "flightId" = $1
              AND "isReserved" = false
            ORDER BY "seatNumber" ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          UPDATE "seat"
          SET "isReserved" = true,
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" IN (SELECT "id" FROM candidate)
          RETURNING *
        `,
        [flightId]
      );

      return this.mapRawSeat(rawSeat?.[0]);
    });
  }

  async releaseSeat(flightId: number, seatNumber: string): Promise<Seat> {
    const releaseResult = await this.seatRepository
      .createQueryBuilder()
      .update(Seat)
      .set({
        isReserved: false,
        updatedAt: () => 'CURRENT_TIMESTAMP'
      })
      .where('"flightId" = :flightId', { flightId })
      .andWhere('"seatNumber" = :seatNumber', { seatNumber })
      .andWhere('"isReserved" = true')
      .returning('*')
      .execute();

    return this.mapRawSeat(releaseResult.raw?.[0]);
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
      .andWhere('seat.isReserved = false')
      .getOne();

    return seat;
  }

  async getSeatsByFlightId(flightId: number): Promise<Seat[]> {
    const list = await this.seatRepository
      .createQueryBuilder('seat')
      .leftJoinAndSelect('seat.flight', 'flight')
      .where('flight.id = :flightId', { flightId })
      .andWhere('seat.isReserved = false')
      .getMany();

    return list;
  }

  async getSeatsByFlightIdAll(flightId: number): Promise<Seat[]> {
    const list = await this.seatRepository
      .createQueryBuilder('seat')
      .leftJoinAndSelect('seat.flight', 'flight')
      .where('flight.id = :flightId', { flightId })
      .getMany();

    return list;
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

  private mapRawSeat(rawSeat?: Partial<Seat> | null): Seat {
    if (!rawSeat) {
      return null;
    }

    return this.seatRepository.create({
      ...rawSeat,
      id: Number(rawSeat.id),
      flightId: Number(rawSeat.flightId),
      seatClass: Number(rawSeat.seatClass),
      seatType: Number(rawSeat.seatType),
      isReserved: Boolean(rawSeat.isReserved),
      createdAt: rawSeat.createdAt ? new Date(rawSeat.createdAt) : new Date(),
      updatedAt: rawSeat.updatedAt ? new Date(rawSeat.updatedAt) : null
    });
  }
}
