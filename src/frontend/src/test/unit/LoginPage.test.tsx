import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@pages/auth/LoginPage';
import { createTestWrapper } from '@/test/utils';

const mutate = vi.fn();

vi.mock('@hooks/useAuth', () => ({
  useLogin: () => ({
    mutate,
    isPending: false,
    isError: false
  })
}));

describe('LoginPage', () => {
  beforeEach(() => {
    mutate.mockReset();
  });

  it('should render login form', () => {
    render(<LoginPage />, { wrapper: createTestWrapper() });

    expect(screen.getAllByText('SkyBooking').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  it('should submit form values', async () => {
    render(<LoginPage />, { wrapper: createTestWrapper() });

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'dev@dev.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Admin@12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({ email: 'dev@dev.com', password: 'Admin@12345' });
    });
  });

  it('should show registration success alert, prefill email and render register CTA', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: { registrationSuccess: true, registeredEmail: 'fresh@example.com' }
          }
        ]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Registration successful')).toBeInTheDocument();
    expect(screen.getByDisplayValue('fresh@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
  });
});
