import apiClient from '@api/axios-instance';
import { ApiPagedResult, PaginationParams } from '@/types/common.types';
import { CreateUserRequest, UpdateUserRequest, UserDto } from '@/types/user.types';

export const userApi = {
  getAll: (params: PaginationParams) =>
    apiClient.get<ApiPagedResult<UserDto[]>>('/api/v1/user/get', { params }),
  getMe: () => apiClient.get<UserDto>('/api/v1/user/me'),
  getById: (id: number) => apiClient.get<UserDto>('/api/v1/user/get-by-id', { params: { id } }),
  create: (data: CreateUserRequest) => apiClient.post<UserDto>('/api/v1/user/create', data),
  update: (id: number, data: UpdateUserRequest) => apiClient.put<void>(`/api/v1/user/update/${id}`, data),
  delete: (id: number) => apiClient.delete<UserDto>('/api/v1/user/delete', { params: { id } })
};
