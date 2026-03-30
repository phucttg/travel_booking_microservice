import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Matches, Min } from 'class-validator';
import { SEAT_NUMBER_REGEX } from 'building-blocks/validation/validation.constants';
import { ToInteger, UppercaseText } from 'building-blocks/validation/validation.decorators';

export class SeatStateQueryDto {
  @ApiProperty()
  @ToInteger()
  @IsInt()
  @Min(1)
  flightId: number;

  @ApiProperty()
  @UppercaseText()
  @IsString()
  @Matches(SEAT_NUMBER_REGEX)
  seatNumber: string;
}
