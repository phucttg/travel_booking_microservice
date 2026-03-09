import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BookingStatus } from '@/booking/enums/booking-status.enum';

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

  @Column()
  description: string;

  @Column()
  seatNumber: string;

  @Column()
  passengerName: string;

  @Column({ nullable: true })
  userId?: number | null;

  @Column({ nullable: true })
  passengerId?: number | null;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.CONFIRMED
  })
  bookingStatus: BookingStatus;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt?: Date | null;

  @Column({ nullable: true })
  canceledAt?: Date | null;

  constructor(partial?: Partial<Booking>) {
    Object.assign(this, partial);
    this.createdAt = partial?.createdAt ?? new Date();
  }
}
