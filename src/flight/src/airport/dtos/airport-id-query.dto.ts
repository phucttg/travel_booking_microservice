import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { ToInteger } from 'building-blocks/validation/validation.decorators';

export class AirportIdQueryDto {
  @ApiProperty({ type: Number })
  @ToInteger()
  @IsInt()
  @Min(1)
  id: number;
}
