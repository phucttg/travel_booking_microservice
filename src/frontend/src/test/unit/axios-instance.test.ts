import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@stores/auth.store';
import apiClient from '@api/axios-instance';

type UnauthorizedError = Error & {
  config: unknown;
  response: {
    status: number;
    data: {
      title: string;
      status: number;
    };
  };
};

describe('axios-instance', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      authInitialized: true
    });
  });

  it('attaches bearer token on request interceptor', async () => {
    useAuthStore.setState({ accessToken: 'access-token', isAuthenticated: true });

    const adapter = vi.fn(async (config) => ({
      data: { authorization: config.headers?.Authorization },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    }));

    const response = await apiClient.get('/api/v1/test', { adapter });

    expect(adapter).toHaveBeenCalled();
    expect(response.data.authorization).toBe('Bearer access-token');
  });

  it('clears auth when 401 and no refresh token', async () => {
    useAuthStore.setState({
      accessToken: 'expired-token',
      refreshToken: null,
      isAuthenticated: true
    });

    const adapter = vi.fn(async (config) => {
      const error = new Error('Unauthorized') as UnauthorizedError;
      error.config = config;
      error.response = { status: 401, data: { title: 'UNAUTHORIZED', status: 401 } };
      throw error;
    });

    await expect(apiClient.get('/api/v1/protected', { adapter })).rejects.toBeDefined();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
