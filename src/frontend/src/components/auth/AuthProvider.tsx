import { PropsWithChildren, useEffect } from 'react';
import { authApi } from '@api/auth.api';
import { userApi } from '@api/user.api';
import { useAuthStore } from '@stores/auth.store';
import { normalizeProblemError } from '@utils/helpers';

const REFRESH_INTERVAL_MS = 25 * 60 * 1000;

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const {
    accessToken,
    refreshToken,
    setTokens,
    setUser,
    isTokenExpired,
    clearAuth,
    markInitialized
  } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      if (!accessToken || !refreshToken) {
        markInitialized(true);
        return;
      }

      try {
        if (isTokenExpired()) {
          const refreshResponse = await authApi.refreshToken({ refreshToken });
          const nextAccessToken = refreshResponse.data?.access?.token;
          const nextRefreshToken = refreshResponse.data?.refresh?.token || refreshToken;
          setTokens(nextAccessToken, nextRefreshToken);
        }

        const userResponse = await userApi.getMe();

        if (!mounted) return;

        setUser(userResponse.data);
        markInitialized(true);
      } catch {
        if (!mounted) return;
        clearAuth();
      }
    };

    void initAuth();

    return () => {
      mounted = false;
    };
  }, [
    accessToken,
    refreshToken,
    setTokens,
    setUser,
    isTokenExpired,
    clearAuth,
    markInitialized
  ]);

  useEffect(() => {
    if (!refreshToken) return;

    const intervalId = window.setInterval(async () => {
      try {
        const refreshResponse = await authApi.refreshToken({ refreshToken });
        const nextAccessToken = refreshResponse.data?.access?.token;
        const nextRefreshToken = refreshResponse.data?.refresh?.token || refreshToken;
        setTokens(nextAccessToken, nextRefreshToken);
      } catch (error) {
        const appError = normalizeProblemError(error);
        if (appError.status >= 400) {
          clearAuth();
          window.location.href = '/login';
        }
      }
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [refreshToken, setTokens, clearAuth]);

  return <>{children}</>;
};
