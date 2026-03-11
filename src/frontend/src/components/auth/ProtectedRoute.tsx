import { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { useAuthStore } from '@stores/auth.store';

export const ProtectedRoute = ({ children }: PropsWithChildren) => {
  const { isAuthenticated, authInitialized } = useAuthStore();

  if (!authInitialized) {
    return <LoadingSpinner fullScreen label="Initializing secure session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
