import { IEvent } from '@nestjs/cqrs';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  Min,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength
} from 'class-validator';
import { ToDate, ToInteger, TrimmedText } from '../validation/validation.decorators';
import { PASSPORT_NUMBER_REGEX } from '../validation/validation.constants';

export enum Role {
  USER = 0,
  ADMIN = 1
}

export enum TokenType {
  ACCESS = 0,
  REFRESH = 1
}

export enum PassengerType {
  UNKNOWN = 0,
  MALE = 1,
  FEMALE = 2,
  BABY = 3
}

export class UserCreated implements IEvent {
  @ToInteger()
  @IsInt()
  id: number;

  @TrimmedText()
  @IsEmail()
  email: string;

  @TrimmedText()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsBoolean()
  isEmailVerified: boolean;

  @ToInteger()
  @IsEnum(Role)
  role: Role;

  @TrimmedText()
  @IsString()
  @IsNotEmpty()
  @Matches(PASSPORT_NUMBER_REGEX)
  passportNumber: string;

  @ToInteger()
  @IsInt()
  @Min(0)
  age: number;

  @ToInteger()
  @IsEnum(PassengerType)
  passengerType: PassengerType;

  @ToDate()
  @IsDate()
  createdAt: Date;

  @IsOptional()
  @ToDate()
  @IsDate()
  updatedAt?: Date;

  constructor(partial?: Partial<UserCreated>) {
    Object.assign(this, partial);
  }
}

export class UserDeleted implements IEvent {
  @ToInteger()
  @IsInt()
  id: number;

  @TrimmedText()
  @IsEmail()
  email: string;

  @TrimmedText()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsBoolean()
  isEmailVerified: boolean;

  @ToInteger()
  @IsEnum(Role)
  role: Role;

  @TrimmedText()
  @IsString()
  @IsNotEmpty()
  @Matches(PASSPORT_NUMBER_REGEX)
  passportNumber: string;

  @ToDate()
  @IsDate()
  createdAt: Date;

  @IsOptional()
  @ToDate()
  @IsDate()
  updatedAt?: Date;

  constructor(partial?: Partial<UserDeleted>) {
    Object.assign(this, partial);
  }
}

export class UserUpdated implements IEvent {
  @ToInteger()
  @IsInt()
  id: number;

  @TrimmedText()
  @IsEmail()
  email: string;

  @TrimmedText()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsBoolean()
  isEmailVerified: boolean;

  @ToInteger()
  @IsEnum(Role)
  role: Role;

  @TrimmedText()
  @IsString()
  @IsNotEmpty()
  @Matches(PASSPORT_NUMBER_REGEX)
  passportNumber: string;

  @ToInteger()
  @IsInt()
  @Min(0)
  age: number;

  @ToInteger()
  @IsEnum(PassengerType)
  passengerType: PassengerType;

  @ToDate()
  @IsDate()
  createdAt: Date;

  @IsOptional()
  @ToDate()
  @IsDate()
  updatedAt?: Date;

  constructor(partial?: Partial<UserUpdated>) {
    Object.assign(this, partial);
  }
}
