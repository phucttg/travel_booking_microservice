import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { PaymentSummaryDto } from '@/booking/dtos/payment-summary.dto';
import { SeatClass } from '@/booking/enums/seat-class.enum';

export class BookingDto {
  id: number;
  flightId?: number | null;
  flightNumber: string;
  aircraftId: number;
  departureAirportId: number;
  arriveAirportId: number;
  flightDate: Date;
  price: number;
  currency: string;
  description: string;
  seatNumber: string;
  seatClass: SeatClass;
  passengerName: string;
  userId?: number | null;
  passengerId?: number | null;
  bookingStatus: BookingStatus;
  paymentId?: number | null;
  paymentExpiresAt?: Date | null;
  confirmedAt?: Date | null;
  expiredAt?: Date | null;
  paymentSummary?: PaymentSummaryDto | null;
  createdAt: Date;
  updatedAt?: Date | null;
  canceledAt?: Date | null;
}
