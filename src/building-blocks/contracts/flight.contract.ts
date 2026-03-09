import { IEvent } from '@nestjs/cqrs';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  MinLength
} from 'class-validator';
import {
  FLIGHT_NUMBER_REGEX,
  SEAT_NUMBER_REGEX
} from '../validation/validation.constants';
import {
  OptionalUppercaseText,
  ToDate,
  ToInteger,
  ToNumber,
  TrimmedText,
  UppercaseText
} from '../validation/validation.decorators';

export enum FlightStatus {
  UNKNOWN = 0,
  FLYING = 1,
  DELAY = 2,
  CANCELED = 3,
  COMPLETED = 4,
  SCHEDULED = 5
}

export enum SeatClass {
  UNKNOWN = 0,
  FIRST_CLASS,
  BUSINESS,
  ECONOMY
}

export enum SeatType {
  UNKNOWN = 0,
  WINDOW,
  MIDDLE,
  AISLE
}

export enum SeatReleaseReason {
  BOOKING_CANCELED = 0,
  BOOKING_CREATE_FAILED = 1
}

export class FlightCreated implements IEvent {
  @ToInteger()
  @IsInt()
  id: number;

  @TrimmedText()
  @IsString()
  @IsNotEmpty()
  @Matches(FLIGHT_NUMBER_REGEX)
  flightNumber: string;

  @ToNumber()
  @IsPositive()
  price: number;

  @ToInteger()
  @IsEnum(FlightStatus)
  flightStatus: FlightStatus;

  @ToDate()
  @IsDate()
  flightDate: Date;

  @ToDate()
  @IsDate()
  departureDate: Date;

  @ToInteger()
  @IsInt()
  departureAirportId: number;

  @ToInteger()
  @IsInt()
  aircraftId: number;

  @ToDate()
  @IsDate()
  arriveDate: Date;

  @ToInteger()
  @IsInt()
  arriveAirportId: number;

  @ToInteger()
  @IsInt()
  durationMinutes: number;

  @ToDate()
  @IsDate()
  createdAt: Date;

  @IsOptional()
  @ToDate()
  @IsDate()
  updatedAt?: Date;

  constructor(request: Partial<FlightCreated> = {}) {
    Object.assign(this, request);
  }
}

export class AircraftCreated implements IEvent {
  @ToInteger()
  @IsInt()
  id: number;

  @TrimmedText()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  model: string;

  @TrimmedText()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ToInteger()
  @IsInt()
  manufacturingYear: number;

  @ToDate()
  @IsDate()
  createdAt: Date;

  @IsOptional()
  @ToDate()
  @IsDate()
  updatedAt?: Date;

  constructor(request: Partial<AircraftCreated> = {}) {
    Object.assign(this, request);
  }
}

export class AirportCreated implements IEvent {
  @ToInteger()
  @IsInt()
  id: number;

  @UppercaseText()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(10)
  code: string;

  @TrimmedText()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @TrimmedText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @ToDate()
  @IsDate()
  createdAt: Date;

  @IsOptional()
  @ToDate()
  @IsDate()
  updatedAt?: Date;

  constructor(request: Partial<AirportCreated> = {}) {
    Object.assign(this, request);
  }
}

export class SeatCreated implements IEvent {
  @ToInteger()
  @IsInt()
  id: number;

  @UppercaseText()
  @IsString()
  @IsNotEmpty()
  @Matches(SEAT_NUMBER_REGEX)
  seatNumber: string;

  @ToInteger()
  @IsEnum(SeatClass)
  seatClass: SeatClass;

  @ToInteger()
  @IsEnum(SeatType)
  seatType: SeatType;

  @ToInteger()
  @IsInt()
  flightId: number;

  @IsBoolean()
  isReserved: boolean;

  @ToDate()
  @IsDate()
  createdAt: Date;

  @IsOptional()
  @ToDate()
  @IsDate()
  updatedAt?: Date;

  constructor(request: Partial<SeatCreated> = {}) {
    Object.assign(this, request);
  }
}

export class SeatReserved implements IEvent {
  @ToInteger()
  @IsInt()
  id: number;

  @UppercaseText()
  @IsString()
  @IsNotEmpty()
  @Matches(SEAT_NUMBER_REGEX)
  seatNumber: string;

  @ToInteger()
  @IsEnum(SeatClass)
  seatClass: SeatClass;

  @ToInteger()
  @IsEnum(SeatType)
  seatType: SeatType;

  @ToInteger()
  @IsInt()
  flightId: number;

  @IsBoolean()
  isReserved: boolean;

  @ToDate()
  @IsDate()
  createdAt: Date;

  @IsOptional()
  @ToDate()
  @IsDate()
  updatedAt?: Date;

  constructor(request: Partial<SeatReserved> = {}) {
    Object.assign(this, request);
  }
}

export class SeatReleaseRequested implements IEvent {
  @IsOptional()
  @ToInteger()
  @IsInt()
  bookingId?: number;

  @UppercaseText()
  @IsString()
  @IsNotEmpty()
  @Matches(SEAT_NUMBER_REGEX)
  seatNumber: string;

  @ToInteger()
  @IsInt()
  flightId: number;

  @ToInteger()
  @IsEnum(SeatReleaseReason)
  reason: SeatReleaseReason;

  @ToDate()
  @IsDate()
  requestedAt: Date;

  constructor(request: Partial<SeatReleaseRequested> = {}) {
    Object.assign(this, request);
  }
}

export class FlightDto {
  id: number;
  flightNumber: string;
  price: number;
  flightStatus: FlightStatus;
  flightDate: Date;
  departureDate: Date;
  departureAirportId: number;
  aircraftId: number;
  arriveDate: Date;
  arriveAirportId: number;
  durationMinutes: number;
  createdAt: Date;
  updatedAt?: Date;

  constructor(request: Partial<FlightDto> = {}) {
    Object.assign(this, request);
  }
}

export class SeatDto {
  id: number;
  seatNumber: string;
  seatClass: SeatClass;
  seatType: SeatType;
  flightId: number;
  isReserved: boolean;
  createdAt: Date;
  updatedAt?: Date;

  constructor(request: Partial<SeatDto> = {}) {
    Object.assign(this, request);
  }
}

export class ReserveSeatRequestDto {
  @IsOptional()
  @OptionalUppercaseText()
  @IsString()
  @Matches(SEAT_NUMBER_REGEX)
  seatNumber?: string;

  @ToInteger()
  @IsInt()
  flightId: number;

  constructor(request: Partial<ReserveSeatRequestDto> = {}) {
    Object.assign(this, request);
  }
}
