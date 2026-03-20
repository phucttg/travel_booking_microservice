import { BookingStatus, SeatClass } from '@/types/enums';
import { PaymentDto, PaymentSummaryDto } from '@/types/payment.types';

export interface BookingDto {
  id: number;
  flightId?: number | null;
  userId?: number | null;
  passengerId?: number | null;
  flightNumber: string;
  aircraftId: number;
  departureAirportId: number;
  arriveAirportId: number;
  flightDate: string | Date;
  price: number;
  currency: string;
  description: string;
  seatNumber: string;
  seatClass: SeatClass;
  passengerName: string;
  bookingStatus: BookingStatus;
  paymentId?: number | null;
  paymentExpiresAt?: string | Date | null;
  confirmedAt?: string | Date | null;
  expiredAt?: string | Date | null;
  paymentSummary?: PaymentSummaryDto | null;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  canceledAt?: string | Date | null;
}

export interface CreateBookingRequest {
  flightId: number;
  description: string;
  seatNumber?: string;
}

export interface BookingCheckoutDto {
  booking: BookingDto;
  payment: PaymentDto;
}
