import { IEvent } from '@nestjs/cqrs';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches, MaxLength } from 'class-validator';
import { SEAT_NUMBER_REGEX, FLIGHT_NUMBER_REGEX } from '../validation/validation.constants';
import { ToDate, ToInteger, ToNumber, TrimmedText, UppercaseText } from '../validation/validation.decorators';

export enum BookingStatus {
  CONFIRMED = 0,
  CANCELED = 1
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
  @ToDate()
  @IsDate()
  updatedAt?: Date | null;

  @IsOptional()
  @ToDate()
  @IsDate()
  canceledAt?: Date | null;

  constructor(partial?: Partial<BookingCreated>) {
    Object.assign(this, partial);
  }
}
