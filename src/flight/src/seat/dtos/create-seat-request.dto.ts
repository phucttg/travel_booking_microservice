import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString, Matches, Min } from 'class-validator';
import { SEAT_NUMBER_REGEX } from 'building-blocks/validation/validation.constants';
import { ToInteger, UppercaseText } from 'building-blocks/validation/validation.decorators';
import { SeatClass } from '@/seat/enums/seat-class.enum';
import { SeatType } from '@/seat/enums/seat-type.enum';

export class CreateSeatRequestDto {
  @ApiProperty()
  @UppercaseText()
  @IsString()
  @IsNotEmpty()
  @Matches(SEAT_NUMBER_REGEX)
  seatNumber: string;

  @ApiProperty({ enum: SeatClass, enumName: 'SeatClass' })
  @ToInteger()
  @IsEnum(SeatClass)
  seatClass: SeatClass;

  @ApiProperty({ enum: SeatType, enumName: 'SeatType' })
  @ToInteger()
  @IsEnum(SeatType)
  seatType: SeatType;

  @ApiProperty()
  @ToInteger()
  @IsInt()
  @Min(1)
  flightId: number;
}
