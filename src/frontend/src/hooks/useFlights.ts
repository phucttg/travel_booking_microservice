import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { flightApi } from '@api/flight.api';
import { CreateFlightRequest, FlightDto } from '@/types/flight.types';
import { AppError, PaginationParams, PagedResult } from '@/types/common.types';
import { buildPaginationParams, normalizeProblemError } from '@utils/helpers';

export const flightKeys = {
  all: ['flights'] as const,
  list: (params: PaginationParams) => ['flights', 'list', params] as const,
  detail: (id: number) => ['flights', 'detail', id] as const
};

const toUiPagedResult = (
  params: PaginationParams,
  apiData: { result: FlightDto[] | null; total: number }
): PagedResult<FlightDto[]> => {
  const pagination = buildPaginationParams(params);
  return {
    data: apiData.result ?? [],
    total: apiData.total,
    page: pagination.page,
    pageSize: pagination.pageSize
  };
};

export const useGetFlights = (params: PaginationParams) =>
  useQuery({
    queryKey: flightKeys.list(buildPaginationParams(params)),
    queryFn: async () => {
      const requestParams = buildPaginationParams(params);
      const response = await flightApi.getAll(requestParams);
      return toUiPagedResult(requestParams, response.data);
    }
  });

export const useGetFlightById = (id: number) =>
  useQuery({
    queryKey: flightKeys.detail(id),
    queryFn: async () => {
      const response = await flightApi.getById(id);
      return response.data;
    },
    enabled: id > 0
  });

export const useCreateFlight = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const getCreateFlightErrorMessage = (appError: AppError): string => {
    if (appError.status === 409) {
      return 'Số hiệu chuyến bay đã tồn tại trong ngày đã chọn';
    }

    if (appError.status === 400) {
      if (appError.message.includes('durationMinutes must match departureDate and arriveDate')) {
        return 'Thời gian bay phải khớp với giờ khởi hành và giờ đến (đã tự tính lại theo phút).';
      }

      if (appError.message.includes('flightDate must match departureDate calendar day')) {
        return 'Ngày bay phải trùng với ngày khởi hành.';
      }

      if (appError.message.includes('must be after departureDate')) {
        return 'Giờ đến phải sau giờ khởi hành.';
      }

      if (appError.message.includes('must be different from departureAirportId')) {
        return 'Sân bay đến phải khác sân bay đi.';
      }

      if (appError.message.includes('flightStatus') && appError.message.includes('UNKNOWN')) {
        return 'Trạng thái chuyến bay không hợp lệ.';
      }
    }

    if (appError.status === 404) {
      if (appError.message.includes('Aircraft not found')) {
        return 'Không tìm thấy máy bay đã chọn.';
      }

      if (appError.message.includes('Departure airport not found')) {
        return 'Không tìm thấy sân bay đi đã chọn.';
      }

      if (appError.message.includes('Arrival airport not found')) {
        return 'Không tìm thấy sân bay đến đã chọn.';
      }
    }

    if (appError.message && appError.message !== 'Có lỗi xảy ra') {
      return appError.message;
    }

    return 'Tạo chuyến bay thất bại. Vui lòng kiểm tra dữ liệu và thử lại.';
  };

  return useMutation({
    mutationFn: async (payload: CreateFlightRequest) => {
      const response = await flightApi.create(payload);
      return response.data;
    },
    onSuccess: () => {
      message.success('Tạo chuyến bay thành công');
      queryClient.invalidateQueries({ queryKey: flightKeys.all });
      navigate('/flights');
    },
    onError: (error) => {
      const appError = normalizeProblemError(error);
      message.error(getCreateFlightErrorMessage(appError));
    }
  });
};
