import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { airportApi } from '@api/airport.api';
import { QUERY_STALE_TIME_MS } from '@utils/constants';
import { CreateAirportRequest } from '@/types/airport.types';
import { normalizeProblemError } from '@utils/helpers';

export const airportKeys = {
  all: ['airports'] as const,
  list: ['airports', 'list'] as const,
  detail: (id: number) => ['airports', 'detail', id] as const
};

export const useGetAirports = () =>
  useQuery({
    queryKey: airportKeys.list,
    queryFn: async () => {
      const response = await airportApi.getAll();
      return response.data;
    },
    staleTime: QUERY_STALE_TIME_MS
  });

export const useGetAirportById = (id: number) =>
  useQuery({
    queryKey: airportKeys.detail(id),
    queryFn: async () => {
      const response = await airportApi.getById(id);
      return response.data;
    },
    enabled: id > 0
  });

export const useCreateAirport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAirportRequest) => {
      const response = await airportApi.create(payload);
      return response.data;
    },
    onSuccess: () => {
      message.success('Airport created successfully');
      queryClient.invalidateQueries({ queryKey: airportKeys.all });
    },
    onError: (error) => {
      const appError = normalizeProblemError(error);
      if (appError.status === 409) {
        message.error('Airport name already exists');
        return;
      }
      message.error(appError.message || 'Failed to create airport');
    }
  });
};
