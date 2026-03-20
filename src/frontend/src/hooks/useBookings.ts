import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { bookingApi } from '@api/booking.api';
import { PaginationParams, PagedResult } from '@/types/common.types';
import { BookingDto, CreateBookingRequest } from '@/types/booking.types';
import { buildPaginationParams, normalizeProblemError } from '@utils/helpers';

export const bookingKeys = {
  all: ['bookings'] as const,
  list: (params: PaginationParams) => ['bookings', 'list', params] as const,
  detail: (id: number) => ['bookings', 'detail', id] as const
};

const toUiPagedResult = (
  params: PaginationParams,
  apiData: { result: BookingDto[] | null; total: number }
): PagedResult<BookingDto[]> => {
  const pagination = buildPaginationParams(params);
  return {
    data: apiData.result ?? [],
    total: apiData.total,
    page: pagination.page,
    pageSize: pagination.pageSize
  };
};

export const useGetBookings = (params: PaginationParams) =>
  useQuery({
    queryKey: bookingKeys.list(buildPaginationParams(params)),
    queryFn: async () => {
      const requestParams = buildPaginationParams(params);
      const response = await bookingApi.getAll(requestParams);
      return toUiPagedResult(requestParams, response.data);
    }
  });

export const useGetBookingById = (id: number) =>
  useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: async () => {
      const response = await bookingApi.getById(id);
      return response.data;
    },
    enabled: id > 0
  });

export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payload, idempotencyKey }: { payload: CreateBookingRequest; idempotencyKey: string }) => {
      const response = await bookingApi.create(payload, idempotencyKey);
      return response.data;
    },
    onSuccess: () => {
      message.success('Đã giữ chỗ, tiếp tục thanh toán');
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
    onError: (error) => {
      const appError = normalizeProblemError(error);
      message.error(appError.message || 'Đặt vé thất bại');
    }
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: number) => {
      await bookingApi.cancel(bookingId);
      return bookingId;
    },
    onSuccess: (bookingId) => {
      message.success('Hủy booking thành công');
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
      queryClient.invalidateQueries({ queryKey: ['seats'] });
    },
    onError: (error) => {
      const appError = normalizeProblemError(error);
      message.error(appError.message || 'Hủy booking thất bại');
    }
  });
};
