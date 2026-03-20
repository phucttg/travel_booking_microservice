export interface ApiPagedResult<T> {
  result: T | null;
  total: number;
}

export interface PagedResult<T> {
  data: T;
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  order?: 'ASC' | 'DESC';
  orderBy?: string;
  searchTerm?: string | null;
}

export interface ProblemDetailsError {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
}

export interface AppError {
  status: number;
  code: string;
  message: string;
  detail?: string;
  meta?: Record<string, unknown>;
  raw?: unknown;
}
