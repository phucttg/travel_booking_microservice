import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import { UserDto } from '@/types/user.types';
import { Role } from '@/types/enums';

type JwtPayload = {
  sub?: number | string;
  exp?: number;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserDto | null;
  isAuthenticated: boolean;
  authInitialized: boolean;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;
  setUser: (user: UserDto | null) => void;
  markInitialized: (initialized: boolean) => void;
  clearAuth: () => void;
  logout: () => void;
  isAdmin: () => boolean;
  getUserIdFromToken: () => number | null;
  isTokenExpired: () => boolean;
};

const parseToken = (token?: string | null): JwtPayload | null => {
  if (!token) return null;
  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      authInitialized: false,
      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
          isAuthenticated: Boolean(accessToken)
        }),
      setUser: (user) => set({ user }),
      markInitialized: (authInitialized) => set({ authInitialized }),
      clearAuth: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          authInitialized: true
        }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          authInitialized: true
        }),
      isAdmin: () => get().user?.role === Role.ADMIN,
      getUserIdFromToken: () => {
        const payload = parseToken(get().accessToken);
        if (!payload?.sub) return null;
        const id = Number(payload.sub);
        return Number.isFinite(id) ? id : null;
      },
      isTokenExpired: () => {
        const payload = parseToken(get().accessToken);
        if (!payload?.exp) return true;
        return payload.exp * 1000 <= Date.now();
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
