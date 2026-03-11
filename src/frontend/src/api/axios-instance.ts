import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_TIMEOUT } from '@utils/constants';
import { useAuthStore } from '@stores/auth.store';
import { normalizeProblemError } from '@utils/helpers';

type RetryRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

type FailedQueueItem = {
  resolve: () => void;
  reject: (error: unknown) => void;
};

const apiClient = axios.create({
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' }
});

const authlessClient = axios.create({
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((entry) => {
    if (error) {
      entry.reject(error);
      return;
    }
    entry.resolve();
  });
  failedQueue = [];
};

const shouldSkipRefresh = (config?: RetryRequestConfig) => {
  const url = config?.url || '';
  return url.includes('/api/v1/identity/login') || url.includes('/api/v1/identity/refresh-token');
};

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(normalizeProblemError(error));
    }

    if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh(originalRequest)) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => resolve(apiClient(originalRequest)),
            reject
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, setTokens, clearAuth } = useAuthStore.getState();

      if (!refreshToken) {
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(normalizeProblemError(error));
      }

      try {
        const response = await authlessClient.post('/api/v1/identity/refresh-token', {
          refreshToken
        });

        setTokens(response.data?.access?.token, response.data?.refresh?.token || refreshToken);
        processQueue(null);

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(normalizeProblemError(refreshError));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeProblemError(error));
  }
);

export default apiClient;
