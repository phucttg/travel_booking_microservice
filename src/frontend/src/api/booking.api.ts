import apiClient from '@api/axios-instance';
import { ApiPagedResult, PaginationParams } from '@/types/common.types';
import { BookingDto, CreateBookingRequest } from '@/types/booking.types';

export const bookingApi = {
  getAll: (params: PaginationParams) =>
    apiClient.get<ApiPagedResult<BookingDto[]>>('/api/v1/booking/get-all', { params }),
  getById: (id: number) => apiClient.get<BookingDto>('/api/v1/booking/get-by-id', { params: { id } }),
  create: (data: CreateBookingRequest) => apiClient.post<BookingDto>('/api/v1/booking/create', data),
  cancel: (id: number) => apiClient.patch<void>(`/api/v1/booking/cancel/${id}`)
};
