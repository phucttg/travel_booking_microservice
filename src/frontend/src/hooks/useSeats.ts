import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { seatApi } from '@api/seat.api';
import { CreateSeatRequest, ReconcileSeatInventoryRequest, ReserveSeatRequest } from '@/types/seat.types';
import { normalizeProblemError } from '@utils/helpers';

export const seatKeys = {
  all: ['seats'] as const,
  byFlight: (flightId: number) => ['seats', 'byFlight', flightId] as const,
  availableByFlight: (flightId: number) => ['seats', 'availableByFlight', flightId] as const
};

export const useGetAvailableSeats = (flightId: number) =>
  useQuery({
    queryKey: seatKeys.availableByFlight(flightId),
    queryFn: async () => {
      const response = await seatApi.getAvailableSeats(flightId);
      return response.data;
    },
    enabled: flightId > 0
  });

export const useGetSeatsByFlight = (flightId: number) =>
  useQuery({
    queryKey: seatKeys.byFlight(flightId),
    queryFn: async () => {
      const response = await seatApi.getByFlight(flightId);
      return response.data;
    },
    enabled: flightId > 0
  });

export const useCreateSeat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSeatRequest) => {
      const response = await seatApi.create(payload);
      return response.data;
    },
    onSuccess: (_, variables) => {
      message.success('Tạo ghế thành công');
      queryClient.invalidateQueries({ queryKey: seatKeys.byFlight(variables.flightId) });
      queryClient.invalidateQueries({ queryKey: seatKeys.availableByFlight(variables.flightId) });
    },
    onError: (error) => {
      const appError = normalizeProblemError(error);
      message.error(appError.message || 'Tạo ghế thất bại');
    }
  });
};

export const useReserveSeat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReserveSeatRequest) => {
      const response = await seatApi.reserve(payload);
      return {
        payload,
        seat: response.data
      };
    },
    onSuccess: ({ payload }) => {
      queryClient.invalidateQueries({ queryKey: seatKeys.byFlight(payload.flightId) });
      queryClient.invalidateQueries({ queryKey: seatKeys.availableByFlight(payload.flightId) });
    },
    onError: (error) => {
      const appError = normalizeProblemError(error);
      message.error(appError.message || 'Giữ ghế thất bại');
    }
  });
};

export const useReconcileMissingSeats = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReconcileSeatInventoryRequest) => {
      const response = await seatApi.reconcileMissing(payload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      if (variables.flightId) {
        queryClient.invalidateQueries({ queryKey: seatKeys.byFlight(variables.flightId) });
        queryClient.invalidateQueries({ queryKey: seatKeys.availableByFlight(variables.flightId) });
      } else {
        queryClient.invalidateQueries({ queryKey: seatKeys.all });
      }

      message.success(
        `Đồng bộ ghế hoàn tất: ${data.fixed} đã sửa, ${data.skipped} đã đầy đủ, ${data.failed} lỗi.`
      );
    },
    onError: (error) => {
      const appError = normalizeProblemError(error);
      message.error(appError.message || 'Đồng bộ ghế thất bại');
    }
  });
};
