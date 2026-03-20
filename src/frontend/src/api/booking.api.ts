import apiClient from '@api/axios-instance';
import { ApiPagedResult, PaginationParams } from '@/types/common.types';
import { BookingCheckoutDto, BookingDto, CreateBookingRequest } from '@/types/booking.types';

export const bookingApi = {
  getAll: (params: PaginationParams) =>
    apiClient.get<ApiPagedResult<BookingDto[]>>('/api/v1/booking/get-all', { params }),
  getById: (id: number) => apiClient.get<BookingDto>('/api/v1/booking/get-by-id', { params: { id } }),
  create: (data: CreateBookingRequest, idempotencyKey: string) =>
    apiClient.post<BookingCheckoutDto>('/api/v1/booking/create', data, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    }),
  cancel: (id: number) => apiClient.patch<void>(`/api/v1/booking/cancel/${id}`)
};
