import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { aircraftApi } from '@api/aircraft.api';
import { QUERY_STALE_TIME_MS } from '@utils/constants';
import { CreateAircraftRequest } from '@/types/aircraft.types';
import { normalizeProblemError } from '@utils/helpers';

export const aircraftKeys = {
  all: ['aircrafts'] as const,
  list: ['aircrafts', 'list'] as const,
  detail: (id: number) => ['aircrafts', 'detail', id] as const
};

export const useGetAircrafts = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: aircraftKeys.list,
    queryFn: async () => {
      const response = await aircraftApi.getAll();
      return response.data;
    },
    staleTime: QUERY_STALE_TIME_MS,
    enabled: options?.enabled ?? true
  });

export const useGetAircraftById = (id: number) =>
  useQuery({
    queryKey: aircraftKeys.detail(id),
    queryFn: async () => {
      const response = await aircraftApi.getById(id);
      return response.data;
    },
    enabled: id > 0
  });

export const useCreateAircraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAircraftRequest) => {
      const response = await aircraftApi.create(payload);
      return response.data;
    },
    onSuccess: () => {
      message.success('Tạo máy bay thành công');
      queryClient.invalidateQueries({ queryKey: aircraftKeys.all });
    },
    onError: (error) => {
      const appError = normalizeProblemError(error);
      if (appError.status === 409) {
        message.error('Tên máy bay đã tồn tại');
        return;
      }
      message.error(appError.message || 'Tạo máy bay thất bại');
    }
  });
};
