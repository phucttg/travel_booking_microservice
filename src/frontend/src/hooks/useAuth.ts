import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { authApi } from '@api/auth.api';
import { userApi } from '@api/user.api';
import { LoginRequest } from '@/types/auth.types';
import { AppError } from '@/types/common.types';
import { useAuthStore } from '@stores/auth.store';
import { normalizeProblemError } from '@utils/helpers';

export const useLogin = () => {
  const navigate = useNavigate();
  const { setTokens, setUser, markInitialized } = useAuthStore();

  return useMutation({
    mutationFn: async (payload: LoginRequest) => {
      const response = await authApi.login(payload);
      const accessToken = response.data?.access?.token;
      const refreshToken = response.data?.refresh?.token || null;

      setTokens(accessToken, refreshToken);
      const userResponse = await userApi.getMe();
      setUser(userResponse.data);
      markInitialized(true);

      return userResponse.data;
    },
    onSuccess: () => {
      message.success('Đăng nhập thành công');
      navigate('/dashboard', { replace: true });
    },
    onError: (error) => {
      const appError = normalizeProblemError(error) as AppError;
      message.error(appError.message || 'Đăng nhập thất bại');
    }
  });
};

export const useLogout = () => {
  const navigate = useNavigate();
  const { accessToken, clearAuth } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      if (!accessToken) return;
      try {
        await authApi.logout({ accessToken });
      } catch (error) {
        const appError = normalizeProblemError(error);
        if (![401, 404].includes(appError.status)) {
          throw appError;
        }
      }
    },
    onSuccess: () => {
      clearAuth();
      navigate('/login', { replace: true });
    },
    onError: () => {
      clearAuth();
      navigate('/login', { replace: true });
    }
  });
};
