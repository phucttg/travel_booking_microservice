import { useQuery } from '@tanstack/react-query';
import { passengerApi } from '@api/passenger.api';
import { PaginationParams, PagedResult } from '@/types/common.types';
import { PassengerDto } from '@/types/passenger.types';
import { buildPaginationParams, normalizeProblemError } from '@utils/helpers';

export const passengerKeys = {
  all: ['passengers'] as const,
  list: (params: PaginationParams) => ['passengers', 'list', params] as const,
  detail: (id: number) => ['passengers', 'detail', id] as const,
  byUserId: (userId: number) => ['passengers', 'user', userId] as const
};

const toUiPagedResult = (
  params: PaginationParams,
  apiData: { result: PassengerDto[] | null; total: number }
): PagedResult<PassengerDto[]> => {
  const pagination = buildPaginationParams(params);
  return {
    data: apiData.result ?? [],
    total: apiData.total,
    page: pagination.page,
    pageSize: pagination.pageSize
  };
};

export const useGetPassengers = (params: PaginationParams) =>
  useQuery({
    queryKey: passengerKeys.list(buildPaginationParams(params)),
    queryFn: async () => {
      const requestParams = buildPaginationParams(params);
      const response = await passengerApi.getAll(requestParams);
      return toUiPagedResult(requestParams, response.data);
    }
  });

export const useGetPassengerById = (id: number) =>
  useQuery({
    queryKey: passengerKeys.detail(id),
    queryFn: async () => {
      const response = await passengerApi.getById(id);
      return response.data;
    },
    enabled: id > 0
  });

export const useGetPassengerByUserId = (userId: number, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: passengerKeys.byUserId(userId),
    queryFn: async () => {
      const response = await passengerApi.getByUserId(userId);
      return response.data;
    },
    enabled: userId > 0 && (options?.enabled ?? true),
    retry: (failureCount, error) => {
      const appError = normalizeProblemError(error);
      return appError.status === 404 && failureCount < 5;
    },
    retryDelay: 1000
  });
