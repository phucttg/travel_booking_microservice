import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { SeatClass } from '@/seat/enums/seat-class.enum';
import { SeatType } from '@/seat/enums/seat-type.enum';
import { Flight } from '@/flight/entities/flight.entity';
import { SeatState } from '@/seat/enums/seat-state.enum';

@Entity()
export class Seat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  seatNumber: string;

  @Column({
    type: 'enum',
    enum: SeatClass,
    default: SeatClass.UNKNOWN
  })
  seatClass: SeatClass;

  @Column({
    type: 'enum',
    enum: SeatType,
    default: SeatType.UNKNOWN
  })
  seatType: SeatType;

  @Column()
  flightId: number;

  @Column({ type: 'boolean', default: false })
  isReserved: boolean;

  @Column({ type: 'int', default: SeatState.AVAILABLE })
  seatState: SeatState;

  @Column({ nullable: true })
  holdToken?: string | null;

  @Column({ nullable: true })
  holdExpiresAt?: Date | null;

  @Column({ nullable: true })
  heldAt?: Date | null;

  @Column({ nullable: true })
  reservedBookingId?: number | null;

  @ManyToOne(() => Flight, (flight) => flight.seats)
  flight?: Flight;

  @Column()
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt?: Date | null;

  constructor(partial?: Partial<Seat>) {
    Object.assign(this, partial);
    this.createdAt = partial?.createdAt ?? new Date();
  }
}
