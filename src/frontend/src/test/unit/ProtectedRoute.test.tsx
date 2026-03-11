import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@components/auth/ProtectedRoute';
import { useAuthStore } from '@stores/auth.store';

describe('ProtectedRoute', () => {
  it('renders children when authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true, authInitialized: true });

    render(
      <MemoryRouter initialEntries={['/']}>
        <ProtectedRoute>
          <div>Private Page</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Private Page')).toBeInTheDocument();
  });

  it('redirects to login when unauthenticated', () => {
    useAuthStore.setState({ isAuthenticated: false, authInitialized: true });

    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route
            path="/private"
            element={
              <ProtectedRoute>
                <div>Private Page</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});
