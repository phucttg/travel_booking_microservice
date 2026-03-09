import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking } from '@/booking/entities/booking.entity';

export interface IBookingRepository {
  createBooking(booking: Booking): Promise<Booking>;
  updateBooking(booking: Booking): Promise<void>;
  findBookingById(id: number, userId?: number): Promise<Booking>;
  findBookings(
    page: number,
    pageSize: number,
    orderBy: string,
    order: 'ASC' | 'DESC',
    userId?: number
  ): Promise<[Booking[], number]>;
}

export class BookingRepository implements IBookingRepository {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>
  ) {}

  async createBooking(booking: Booking): Promise<Booking> {
    return await this.bookingRepository.save(booking);
  }

  async updateBooking(booking: Booking): Promise<void> {
    await this.bookingRepository.update(booking.id, booking);
  }

  async findBookingById(id: number, userId?: number): Promise<Booking> {
    const queryBuilder = this.bookingRepository.createQueryBuilder('booking').where('booking.id = :id', {
      id
    });

    if (typeof userId === 'number') {
      queryBuilder.andWhere('booking.userId = :userId', { userId });
    }

    return await queryBuilder.getOne();
  }

  async findBookings(
    page: number,
    pageSize: number,
    orderBy: string,
    order: 'ASC' | 'DESC',
    userId?: number
  ): Promise<[Booking[], number]> {
    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .orderBy(`booking.${orderBy}`, order)
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (typeof userId === 'number') {
      queryBuilder.andWhere('booking.userId = :userId', { userId });
    }

    return await queryBuilder.getManyAndCount();
  }
}
