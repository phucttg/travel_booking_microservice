import { IEvent } from '@nestjs/cqrs';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength
} from 'class-validator';
import { SEAT_NUMBER_REGEX, FLIGHT_NUMBER_REGEX } from '../validation/validation.constants';
import { ToDate, ToInteger, ToNumber, TrimmedText, UppercaseText } from '../validation/validation.decorators';
import { SeatClass } from './flight.contract';

export enum BookingStatus {
  PENDING_PAYMENT = 0,
  CONFIRMED = 1,
  EXPIRED = 2,
  CANCELED = 3
}

export class BookingCreated implements IEvent {
  @ToInteger()
  @IsInt()
  id: number;

  @TrimmedText()
  @IsString()
  @IsNotEmpty()
  @Matches(FLIGHT_NUMBER_REGEX)
  flightNumber: string;

  @ToInteger()
  @IsInt()
  flightId: number;

  @ToInteger()
  @IsInt()
  aircraftId: number;

  @ToInteger()
  @IsInt()
  departureAirportId: number;

  @ToInteger()
  @IsInt()
  arriveAirportId: number;

  @ToDate()
  @IsDate()
  flightDate: Date;

  @ToNumber()
  @IsPositive()
  price: number;

  @ToInteger()
  @IsEnum(SeatClass)
  seatClass: SeatClass;

  @TrimmedText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(3)
  currency: string;

  @TrimmedText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @UppercaseText()
  @IsString()
  @IsNotEmpty()
  @Matches(SEAT_NUMBER_REGEX)
  seatNumber: string;

  @TrimmedText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  passengerName: string;

  @ToInteger()
  @IsInt()
  userId: number;

  @ToInteger()
  @IsInt()
  passengerId: number;

  @ToInteger()
  @IsEnum(BookingStatus)
  bookingStatus: BookingStatus;

  @ToDate()
  @IsDate()
  createdAt: Date;

  @IsOptional()
  @ToInteger()
  @IsInt()
  paymentId?: number | null;

  @IsOptional()
  @ToDate()
  @IsDate()
  paymentExpiresAt?: Date | null;

  @IsOptional()
  @ToDate()
  @IsDate()
  confirmedAt?: Date | null;

  @IsOptional()
  @ToDate()
  @IsDate()
  updatedAt?: Date | null;

  @IsOptional()
  @ToDate()
  @IsDate()
  canceledAt?: Date | null;

  @IsOptional()
  @ToDate()
  @IsDate()
  expiredAt?: Date | null;

  constructor(partial?: Partial<BookingCreated>) {
    Object.assign(this, partial);
  }
}
