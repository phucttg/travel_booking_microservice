import { IsInt } from 'class-validator';
import { ToInteger } from 'building-blocks/validation/validation.decorators';

export class PaymentBookingIdQueryDto {
  @ToInteger()
  @IsInt()
  bookingId: number;
}
