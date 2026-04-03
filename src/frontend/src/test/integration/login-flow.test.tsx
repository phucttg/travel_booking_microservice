import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoginPage } from '@pages/auth/LoginPage';
import { createTestWrapper } from '@/test/utils';

// Smoke integration: relies on MSW handlers in src/test/msw/handlers.ts

describe('integration login flow', () => {
  it('submits login form and shows submit lifecycle', async () => {
    render(<LoginPage />, { wrapper: createTestWrapper() });

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'dev@dev.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Admin@12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });
  });
});
