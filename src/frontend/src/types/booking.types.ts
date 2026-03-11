import { BookingStatus } from '@/types/enums';

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
  description: string;
  seatNumber: string;
  passengerName: string;
  bookingStatus: BookingStatus;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  canceledAt?: string | Date | null;
}

export interface CreateBookingRequest {
  flightId: number;
  description: string;
  seatNumber?: string;
}
