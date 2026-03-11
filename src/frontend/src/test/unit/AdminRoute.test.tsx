import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminRoute } from '@components/auth/AdminRoute';
import { useAuthStore } from '@stores/auth.store';
import { Role } from '@/types/enums';

describe('AdminRoute', () => {
  it('renders child route for admin', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      authInitialized: true,
      user: {
        id: 1,
        email: 'admin@dev.com',
        name: 'admin',
        role: Role.ADMIN,
        passportNumber: '123',
        isEmailVerified: true,
        createdAt: new Date().toISOString()
      }
    });

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route element={<AdminRoute />}>
            <Route path="/admin/users" element={<div>Users page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Users page')).toBeInTheDocument();
  });

  it('shows denied screen for normal user', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      authInitialized: true,
      user: {
        id: 2,
        email: 'user@dev.com',
        name: 'user',
        role: Role.USER,
        passportNumber: '456',
        isEmailVerified: true,
        createdAt: new Date().toISOString()
      }
    });

    render(
      <MemoryRouter>
        <AdminRoute />
      </MemoryRouter>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });
});
