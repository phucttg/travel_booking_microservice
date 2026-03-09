import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { SEAT_NUMBER_REGEX } from 'building-blocks/validation/validation.constants';
import {
  OptionalUppercaseText,
  SanitizedText,
  ToInteger
} from 'building-blocks/validation/validation.decorators';

export class CreateBookingRequestDto {
  @ApiProperty()
  @ToInteger()
  @IsInt()
  @Min(1)
  flightId: number;

  @ApiProperty()
  @SanitizedText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ required: false })
  @IsOptional()
  @OptionalUppercaseText()
  @IsString()
  @Matches(SEAT_NUMBER_REGEX)
  seatNumber?: string;
}
