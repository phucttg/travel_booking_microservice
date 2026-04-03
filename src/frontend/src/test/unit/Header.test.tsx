import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Header } from '@components/layout/Header';
import { useUiStore } from '@stores/ui.store';
import { setAuthenticatedUser } from '@/test/frontend.fixtures';
import { createTestWrapper } from '@/test/utils';

const renderHeader = (route: string) =>
  render(<Header />, {
    wrapper: createTestWrapper({
      useMemoryRouter: true,
      initialEntries: [route]
    })
  });

describe('Header', () => {
  it('renders breadcrumb for /dashboard and does not render route subtitle or heading title', () => {
    setAuthenticatedUser();
    useUiStore.setState({
      sidebarCollapsed: false,
      mobileSidebarOpen: false
    });

    renderHeader('/dashboard');

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Operations overview and live workspace context')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('keeps breadcrumb readable for long route /payments/reconcile', () => {
    setAuthenticatedUser();
    useUiStore.setState({
      sidebarCollapsed: false,
      mobileSidebarOpen: false
    });

    renderHeader('/payments/reconcile');

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Thanh toán' })).toBeInTheDocument();

    const currentCrumb = screen.getByText('Duyệt nạp ví');
    expect(currentCrumb).toHaveClass('app-header__crumb--current');
    expect(document.querySelector('.app-header__breadcrumb')).toBeInTheDocument();
  });

  it('renders wallet breadcrumb in English for /wallet', () => {
    setAuthenticatedUser();
    useUiStore.setState({
      sidebarCollapsed: false,
      mobileSidebarOpen: false
    });

    renderHeader('/wallet');

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    const currentCrumb = screen.getByText('My Wallet');
    expect(currentCrumb).toHaveClass('app-header__crumb--current');
  });
});
