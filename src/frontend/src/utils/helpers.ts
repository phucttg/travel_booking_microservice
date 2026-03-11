import { AppError, PaginationParams, ProblemDetailsError } from '@/types/common.types';

export const normalizeSearchTerm = (searchTerm?: string | null): string | null => {
  const normalized = searchTerm?.trim();
  return normalized ? normalized : null;
};

export const buildPaginationParams = (params: PaginationParams): Required<PaginationParams> => ({
  page: params.page ?? 1,
  pageSize: params.pageSize ?? 10,
  order: params.order ?? 'ASC',
  orderBy: params.orderBy ?? 'id',
  searchTerm: normalizeSearchTerm(params.searchTerm)
});

export const parseRouteId = (value?: string): number => {
  const id = Number(value);
  return Number.isFinite(id) ? id : 0;
};

export const debounce = <TArgs extends unknown[]>(fn: (...args: TArgs) => void, wait = 300) => {
  let timeout: number | undefined;
  return (...args: TArgs) => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => fn(...args), wait);
  };
};

type ErrorResponseShape = {
  status?: number;
  data?: unknown;
};

type ErrorWithResponse = {
  response?: ErrorResponseShape;
};

const isAppError = (error: unknown): error is AppError => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  return (
    'status' in error &&
    'code' in error &&
    'message' in error &&
    typeof (error as AppError).status === 'number' &&
    typeof (error as AppError).code === 'string' &&
    typeof (error as AppError).message === 'string'
  );
};

const getMessageFromUnknownError = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null || !('message' in error)) {
    return undefined;
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' && message.trim() ? message : undefined;
};

const getResponseFromUnknownError = (error: unknown): ErrorResponseShape | undefined => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined;
  }

  const response = (error as ErrorWithResponse).response;
  return typeof response === 'object' && response !== null ? response : undefined;
};

export const normalizeProblemError = (error: unknown): AppError => {
  if (isAppError(error)) {
    return error;
  }

  const fallbackMessage = getMessageFromUnknownError(error) || 'Có lỗi xảy ra';
  const response = getResponseFromUnknownError(error);

  if (response) {
    const payload =
      typeof response.data === 'object' && response.data !== null
        ? (response.data as Partial<ProblemDetailsError>)
        : {};

    return {
      status: Number(payload.status || response.status || 500),
      code: payload.type || 'UNEXPECTED_ERROR',
      message: payload.title || fallbackMessage,
      detail: payload.detail,
      raw: error
    };
  }

  return {
    status: 500,
    code: 'UNEXPECTED_ERROR',
    message: fallbackMessage,
    raw: error
  };
};
