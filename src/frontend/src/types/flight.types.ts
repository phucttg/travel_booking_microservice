import { FlightStatus } from '@/types/enums';

export interface FlightDto {
  id: number;
  flightNumber: string;
  price: number;
  flightStatus: FlightStatus;
  flightDate: string | Date;
  departureDate: string | Date;
  departureAirportId: number;
  aircraftId: number;
  arriveDate: string | Date;
  arriveAirportId: number;
  durationMinutes: number;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface CreateFlightRequest {
  flightNumber: string;
  price: number;
  flightStatus: FlightStatus;
  flightDate: Date;
  departureDate: Date;
  departureAirportId: number;
  aircraftId: number;
  arriveDate: Date;
  arriveAirportId: number;
  durationMinutes: number;
}
