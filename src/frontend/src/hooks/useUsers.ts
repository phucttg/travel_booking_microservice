import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { userApi } from '@api/user.api';
import { AppError, PaginationParams, PagedResult } from '@/types/common.types';
import { CreateUserRequest, UpdateUserRequest, UserDto } from '@/types/user.types';
import { buildPaginationParams, normalizeProblemError } from '@utils/helpers';

export const userKeys = {
  all: ['users'] as const,
  list: (params: PaginationParams) => ['users', 'list', params] as const,
  detail: (id: number) => ['users', 'detail', id] as const
};

const toUiPagedResult = (params: PaginationParams, apiData: { result: UserDto[] | null; total: number }) => {
  const pagination = buildPaginationParams(params);
  const result: PagedResult<UserDto[]> = {
    data: apiData.result ?? [],
    total: apiData.total,
    page: pagination.page,
    pageSize: pagination.pageSize
  };
  return result;
};

export const useGetUsers = (params: PaginationParams) =>
  useQuery({
    queryKey: userKeys.list(buildPaginationParams(params)),
    queryFn: async () => {
      const requestParams = buildPaginationParams(params);
      const response = await userApi.getAll(requestParams);
      return toUiPagedResult(requestParams, response.data);
    }
  });

export const useGetUserById = (id: number) =>
  useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      const response = await userApi.getById(id);
      return response.data;
    },
    enabled: id > 0
  });

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateUserRequest) => {
      const response = await userApi.create(payload);
      return response.data;
    },
    onSuccess: () => {
      message.success('Tạo user thành công');
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (error) => {
      const appError = normalizeProblemError(error) as AppError;
      if (appError.status === 409) {
        message.error('Email đã tồn tại');
        return;
      }
      message.error(appError.message || 'Tạo user thất bại');
    }
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateUserRequest }) => {
      await userApi.update(id, payload);
    },
    onSuccess: (_, variables) => {
      message.success('Cập nhật user thành công');
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
    },
    onError: (error) => {
      const appError = normalizeProblemError(error) as AppError;
      if (appError.status === 409) {
        message.error('Email đã tồn tại');
        return;
      }
      message.error(appError.message || 'Cập nhật user thất bại');
    }
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await userApi.delete(id);
      return response.data;
    },
    onSuccess: () => {
      message.success('Xóa user thành công');
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    onError: (error) => {
      const appError = normalizeProblemError(error) as AppError;
      message.error(appError.message || 'Xóa user thất bại');
    }
  });
};
