import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@stores/auth.store';
import { Role } from '@/types/enums';

const createToken = (payload: Record<string, unknown>) => {
  const header = globalThis.btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = globalThis.btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
};

describe('auth.store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      authInitialized: true
    });
  });

  it('setTokens should update tokens and isAuthenticated', () => {
    const { setTokens } = useAuthStore.getState();
    setTokens('access-token', 'refresh-token');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access-token');
    expect(state.refreshToken).toBe('refresh-token');
    expect(state.isAuthenticated).toBe(true);
  });

  it('logout should clear auth state', () => {
    useAuthStore.setState({
      accessToken: 'a',
      refreshToken: 'r',
      user: {
        id: 1,
        email: 'dev@dev.com',
        name: 'dev',
        isEmailVerified: true,
        role: Role.USER,
        passportNumber: '123',
        createdAt: new Date().toISOString()
      },
      isAuthenticated: true,
      authInitialized: true
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('isAdmin should return true for admin user', () => {
    useAuthStore.setState({
      user: {
        id: 1,
        email: 'admin@dev.com',
        name: 'admin',
        isEmailVerified: true,
        role: Role.ADMIN,
        passportNumber: '123',
        createdAt: new Date().toISOString()
      }
    });

    expect(useAuthStore.getState().isAdmin()).toBe(true);
  });

  it('isTokenExpired should detect expired token', () => {
    const expired = createToken({ sub: 1, exp: Math.floor(Date.now() / 1000) - 60 });
    const valid = createToken({ sub: 1, exp: Math.floor(Date.now() / 1000) + 3600 });

    useAuthStore.setState({ accessToken: expired });
    expect(useAuthStore.getState().isTokenExpired()).toBe(true);

    useAuthStore.setState({ accessToken: valid });
    expect(useAuthStore.getState().isTokenExpired()).toBe(false);
  });
});
