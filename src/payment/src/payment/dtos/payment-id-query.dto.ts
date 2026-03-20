import { IsInt } from 'class-validator';
import { ToInteger } from 'building-blocks/validation/validation.decorators';

export class PaymentIdQueryDto {
  @ToInteger()
  @IsInt()
  id: number;
}
