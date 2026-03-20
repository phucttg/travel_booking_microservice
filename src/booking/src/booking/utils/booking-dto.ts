import { BookingDto } from '@/booking/dtos/booking.dto';
import { Booking } from '@/booking/entities/booking.entity';
import { PaymentSummaryDto } from '@/booking/dtos/payment-summary.dto';

export const toBookingDto = (booking: Booking, paymentSummary?: PaymentSummaryDto | null): BookingDto =>
  ({
    id: booking.id,
    flightId: booking.flightId,
    flightNumber: booking.flightNumber,
    aircraftId: booking.aircraftId,
    departureAirportId: booking.departureAirportId,
    arriveAirportId: booking.arriveAirportId,
    flightDate: booking.flightDate,
    price: booking.price,
    currency: booking.currency,
    description: booking.description,
    seatNumber: booking.seatNumber,
    seatClass: booking.seatClass,
    passengerName: booking.passengerName,
    userId: booking.userId,
    passengerId: booking.passengerId,
    bookingStatus: booking.bookingStatus,
    paymentId: booking.paymentId,
    paymentExpiresAt: booking.paymentExpiresAt,
    confirmedAt: booking.confirmedAt,
    expiredAt: booking.expiredAt,
    paymentSummary: paymentSummary ?? null,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    canceledAt: booking.canceledAt
  }) as BookingDto;
