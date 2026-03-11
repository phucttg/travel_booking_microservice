import apiClient from '@api/axios-instance';
import {
  AuthResponse,
  LoginRequest,
  LogoutRequest,
  RefreshTokenRequest
} from '@/types/auth.types';

export const authApi = {
  login: (data: LoginRequest) => apiClient.post<AuthResponse>('/api/v1/identity/login', data),
  logout: (data: LogoutRequest) => apiClient.post<void>('/api/v1/identity/logout', data),
  refreshToken: (data: RefreshTokenRequest) =>
    apiClient.post<AuthResponse>('/api/v1/identity/refresh-token', data)
};
