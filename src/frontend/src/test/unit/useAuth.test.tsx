import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useLogin, useLogout } from '@hooks/useAuth';
import { authApi } from '@api/auth.api';
import { userApi } from '@api/user.api';
import { createTestWrapper } from '@/test/utils';
import { useAuthStore } from '@stores/auth.store';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

vi.mock('@api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn()
  }
}));

vi.mock('@api/user.api', () => ({
  userApi: {
    getMe: vi.fn(),
    getById: vi.fn()
  }
}));

describe('useAuth hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      authInitialized: true
    });
  });

  it('login success should set auth and navigate dashboard', async () => {
    const token =
      'eyJhbGciOiJIUzI1NiJ9.' +
      globalThis.btoa(JSON.stringify({ sub: 1, exp: Math.floor(Date.now() / 1000) + 3600 })) +
      '.sig';

    const loginResponse = {
      data: {
        access: { token, expires: new Date().toISOString() },
        refresh: { token: 'refresh', expires: new Date().toISOString() }
      }
    };

    vi.mocked(authApi.login).mockResolvedValue(
      loginResponse as Awaited<ReturnType<typeof authApi.login>>
    );

    const userResponse = {
      data: {
        id: 1,
        email: 'dev@dev.com',
        name: 'developer',
        role: 1,
        passportNumber: '12345678',
        isEmailVerified: true,
        createdAt: new Date().toISOString()
      }
    };

    vi.mocked(userApi.getMe).mockResolvedValue(
      userResponse as Awaited<ReturnType<typeof userApi.getMe>>
    );

    const { result } = renderHook(() => useLogin(), { wrapper: createTestWrapper() });

    result.current.mutate({ email: 'dev@dev.com', password: 'Admin@12345' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('login error should set mutation error', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useLogin(), { wrapper: createTestWrapper() });

    result.current.mutate({ email: 'wrong@dev.com', password: 'wrong' });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('logout should clear auth and navigate login', async () => {
    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
      authInitialized: true
    });

    vi.mocked(authApi.logout).mockResolvedValue(
      { data: undefined } as Awaited<ReturnType<typeof authApi.logout>>
    );

    const { result } = renderHook(() => useLogout(), { wrapper: createTestWrapper() });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
