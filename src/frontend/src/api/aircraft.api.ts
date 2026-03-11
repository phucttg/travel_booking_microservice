import apiClient from '@api/axios-instance';
import { AircraftDto, CreateAircraftRequest } from '@/types/aircraft.types';

export const aircraftApi = {
  getAll: () => apiClient.get<AircraftDto[]>('/api/v1/aircraft/get-all'),
  getById: (id: number) => apiClient.get<AircraftDto>('/api/v1/aircraft/get-by-id', { params: { id } }),
  create: (data: CreateAircraftRequest) => apiClient.post<AircraftDto>('/api/v1/aircraft/create', data)
};
