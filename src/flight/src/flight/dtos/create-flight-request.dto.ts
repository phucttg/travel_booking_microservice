import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsPositive, IsString, Matches, Min } from 'class-validator';
import { FLIGHT_NUMBER_REGEX } from 'building-blocks/validation/validation.constants';
import { ToDate, ToInteger, ToNumber, TrimmedText } from 'building-blocks/validation/validation.decorators';
import { FlightStatus } from '@/flight/enums/flight-status.enum';

export class CreateFlightRequestDto {
  @ApiProperty()
  @TrimmedText()
  @IsString()
  @IsNotEmpty()
  @Matches(FLIGHT_NUMBER_REGEX)
  flightNumber: string;

  @ApiProperty()
  @ToNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ enum: FlightStatus, enumName: 'FlightStatus' })
  @ToInteger()
  @IsEnum(FlightStatus)
  flightStatus: FlightStatus;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description:
      'Backward-compatible input. Service derives canonical flightDate from departureDate using Asia/Ho_Chi_Minh business day.'
  })
  @ToDate()
  @IsDate()
  flightDate: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @ToDate()
  @IsDate()
  departureDate: Date;

  @ApiProperty()
  @ToInteger()
  @IsInt()
  @Min(1)
  departureAirportId: number;

  @ApiProperty()
  @ToInteger()
  @IsInt()
  @Min(1)
  aircraftId: number;

  @ApiProperty({ type: String, format: 'date-time' })
  @ToDate()
  @IsDate()
  arriveDate: Date;

  @ApiProperty()
  @ToInteger()
  @IsInt()
  @Min(1)
  arriveAirportId: number;

  @ApiProperty()
  @ToInteger()
  @IsInt()
  @Min(1)
  durationMinutes: number;
}
