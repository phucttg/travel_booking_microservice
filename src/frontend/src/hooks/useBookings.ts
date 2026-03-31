import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { bookingApi } from '@api/booking.api';
import { AppError, PaginationParams, PagedResult } from '@/types/common.types';
import { BookingDto, CreateBookingRequest } from '@/types/booking.types';
import { buildPaginationParams, normalizeProblemError } from '@utils/helpers';

const HANDLED_CREATE_BOOKING_ERROR_CODES = new Set([
  'ACTIVE_BOOKING_EXISTS',
  'PREMIUM_SEAT_SELECTION_REQUIRED'
]);
const HANDLED_CREATE_BOOKING_ERROR_MESSAGES = new Set([
  'An active booking already exists for this flight',
  'Economy seats are sold out. Please select a premium seat to continue.'
]);

const getCreateBookingBusinessCode = (appError: AppError): string => {
  const rawResponseData =
    typeof appError.raw === 'object' &&
    appError.raw !== null &&
    'response' in appError.raw &&
    typeof (appError.raw as { response?: { data?: unknown } }).response?.data === 'object' &&
    (appError.raw as { response?: { data?: unknown } }).response?.data !== null
      ? ((appError.raw as { response?: { data?: Record<string, unknown> } }).response?.data as Record<string, unknown>)
      : null;

  if (typeof rawResponseData?.code === 'string' && rawResponseData.code) {
    return rawResponseData.code;
  }

  if (typeof appError.meta?.code === 'string' && appError.meta.code) {
    return appError.meta.code;
  }

  return appError.code || '';
};

const getCreateBookingBusinessMessage = (appError: AppError): string => {
  const rawResponseData =
    typeof appError.raw === 'object' &&
    appError.raw !== null &&
    'response' in appError.raw &&
    typeof (appError.raw as { response?: { data?: unknown } }).response?.data === 'object' &&
    (appError.raw as { response?: { data?: unknown } }).response?.data !== null
      ? ((appError.raw as { response?: { data?: Record<string, unknown> } }).response?.data as Record<string, unknown>)
      : null;

  if (typeof rawResponseData?.title === 'string' && rawResponseData.title) {
    return rawResponseData.title;
  }

  if (typeof rawResponseData?.message === 'string' && rawResponseData.message) {
    return rawResponseData.message;
  }

  return appError.message || '';
};

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

type UseGetBookingByIdOptions = {
  enabled?: boolean;
  refetchInterval?: number | false | ((query: any) => number | false | undefined);
  refetchIntervalInBackground?: boolean;
  retry?: boolean | number;
  refetchOnWindowFocus?: boolean;
};

export const useGetBookingById = (id: number, options?: UseGetBookingByIdOptions) =>
  useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: async () => {
      const response = await bookingApi.getById(id);
      return response.data;
    },
    enabled: (options?.enabled ?? true) && id > 0,
    refetchInterval: options?.refetchInterval,
    refetchIntervalInBackground: options?.refetchIntervalInBackground,
    retry: options?.retry,
    refetchOnWindowFocus: options?.refetchOnWindowFocus
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
      const businessCode = getCreateBookingBusinessCode(appError);
      const businessMessage = getCreateBookingBusinessMessage(appError);
      const isGenericCreateBookingConflict =
        appError.status === 409 && appError.message === 'Request failed with status code 409';

      if (
        isGenericCreateBookingConflict ||
        HANDLED_CREATE_BOOKING_ERROR_CODES.has(businessCode) ||
        HANDLED_CREATE_BOOKING_ERROR_MESSAGES.has(businessMessage)
      ) {
        return;
      }

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
