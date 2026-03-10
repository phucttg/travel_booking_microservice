import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ToInteger } from 'building-blocks/validation/validation.decorators';

export class ReconcileSeatInventoryQueryDto {
  @ApiPropertyOptional({ type: Number, description: 'Optional flight id. If omitted, reconcile all flights.' })
  @IsOptional()
  @ToInteger()
  @IsInt()
  @Min(1)
  flightId?: number;
}
