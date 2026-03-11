import apiClient from '@api/axios-instance';
import {
  CreateSeatRequest,
  ReconcileSeatInventoryRequest,
  ReconcileSeatInventoryResponse,
  ReserveSeatRequest,
  SeatDto
} from '@/types/seat.types';

export const seatApi = {
  getAvailableSeats: (flightId: number) =>
    apiClient.get<SeatDto[]>('/api/v1/seat/get-available-seats', { params: { flightId } }),
  getByFlight: (flightId: number) =>
    apiClient.get<SeatDto[]>('/api/v1/seat/get-by-flight-id', { params: { flightId } }),
  create: (data: CreateSeatRequest) => apiClient.post<SeatDto>('/api/v1/seat/create', data),
  reserve: (data: ReserveSeatRequest) => apiClient.post<SeatDto>('/api/v1/seat/reserve', data),
  reconcileMissing: (query: ReconcileSeatInventoryRequest) =>
    apiClient.post<ReconcileSeatInventoryResponse>('/api/v1/seat/reconcile-missing', null, {
      params: query
    })
};
