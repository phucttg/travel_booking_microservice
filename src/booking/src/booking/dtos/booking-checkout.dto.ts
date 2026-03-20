import { BookingDto } from '@/booking/dtos/booking.dto';
import { PaymentDto } from '@/booking/dtos/payment-summary.dto';

export class BookingCheckoutDto {
  booking: BookingDto;
  payment: PaymentDto;

  constructor(partial: Partial<BookingCheckoutDto> = {}) {
    Object.assign(this, partial);
  }
}
