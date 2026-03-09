import { BookingStatus } from '@/booking/enums/booking-status.enum';

export class BookingDto {
  id: number;
  flightId?: number | null;
  flightNumber: string;
  aircraftId: number;
  departureAirportId: number;
  arriveAirportId: number;
  flightDate: Date;
  price: number;
  description: string;
  seatNumber: string;
  passengerName: string;
  userId?: number | null;
  passengerId?: number | null;
  bookingStatus: BookingStatus;
  createdAt: Date;
  updatedAt?: Date | null;
  canceledAt?: Date | null;
}
