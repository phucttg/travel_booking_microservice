import apiClient from '@api/axios-instance';
import { ApiPagedResult, PaginationParams } from '@/types/common.types';
import { PassengerDto } from '@/types/passenger.types';

export const passengerApi = {
  getAll: (params: PaginationParams) =>
    apiClient.get<ApiPagedResult<PassengerDto[]>>('/api/v1/passenger/get-all', { params }),
  getById: (id: number) =>
    apiClient.get<PassengerDto>('/api/v1/passenger/get-by-id', { params: { id } }),
  getByUserId: (userId: number) =>
    apiClient.get<PassengerDto>('/api/v1/passenger/get-by-user-id', { params: { userId } })
};
