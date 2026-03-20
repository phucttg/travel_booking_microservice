import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { SeatClass } from '@/booking/enums/seat-class.enum';

@Entity()
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  flightNumber: string;

  @Column({ nullable: true })
  flightId?: number | null;

  @Column()
  aircraftId: number;

  @Column()
  departureAirportId: number;

  @Column()
  arriveAirportId: number;

  @Column()
  flightDate: Date;

  @Column()
  price: number;

  @Column({ default: 'VND' })
  currency: string;

  @Column()
  description: string;

  @Column()
  seatNumber: string;

  @Column({ type: 'int', default: SeatClass.UNKNOWN })
  seatClass: SeatClass;

  @Column()
  passengerName: string;

  @Column({ nullable: true })
  userId?: number | null;

  @Column({ nullable: true })
  passengerId?: number | null;

  @Column({ type: 'int', default: BookingStatus.PENDING_PAYMENT })
  bookingStatus: BookingStatus;

  @Column({ nullable: true, unique: true })
  paymentId?: number | null;

  @Column({ nullable: true })
  paymentExpiresAt?: Date | null;

  @Column({ nullable: true })
  confirmedAt?: Date | null;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt?: Date | null;

  @Column({ nullable: true })
  canceledAt?: Date | null;

  @Column({ nullable: true })
  expiredAt?: Date | null;

  constructor(partial?: Partial<Booking>) {
    Object.assign(this, partial);
    this.createdAt = partial?.createdAt ?? new Date();
  }
}
