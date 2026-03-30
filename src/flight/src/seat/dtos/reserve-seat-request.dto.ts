import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { SEAT_NUMBER_REGEX } from 'building-blocks/validation/validation.constants';
import { OptionalUppercaseText, ToDate, ToInteger } from 'building-blocks/validation/validation.decorators';

export class ReserveSeatRequestDto {
  @ApiPropertyOptional({ required: false })
  @IsOptional()
  @OptionalUppercaseText()
  @IsString()
  @Matches(SEAT_NUMBER_REGEX)
  seatNumber?: string;

  @ApiProperty()
  @ToInteger()
  @IsInt()
  @Min(1)
  flightId: number;

  @ApiPropertyOptional({ required: false })
  @IsOptional()
  @ToDate()
  @IsDate()
  holdUntil?: Date;
}
