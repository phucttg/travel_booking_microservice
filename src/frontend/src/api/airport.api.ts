import apiClient from '@api/axios-instance';
import { AirportDto, CreateAirportRequest } from '@/types/airport.types';

export const airportApi = {
  getAll: () => apiClient.get<AirportDto[]>('/api/v1/airport/get-all'),
  getById: (id: number) => apiClient.get<AirportDto>('/api/v1/airport/get-by-id', { params: { id } }),
  create: (data: CreateAirportRequest) => apiClient.post<AirportDto>('/api/v1/airport/create', data)
};
