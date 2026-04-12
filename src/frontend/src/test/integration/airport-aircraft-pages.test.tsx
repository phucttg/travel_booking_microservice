import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { AircraftFormPage } from '@pages/aircrafts/AircraftFormPage';
import { AircraftListPage } from '@pages/aircrafts/AircraftListPage';
import { AirportFormPage } from '@pages/airports/AirportFormPage';
import { AirportListPage } from '@pages/airports/AirportListPage';
import { aircrafts, airports, setAuthenticatedUser } from '@/test/frontend.fixtures';
import { server } from '@/test/msw/server';
import { renderWithRoute } from '@/test/utils';
import { Role } from '@/types/enums';

describe('airport and aircraft pages', () => {
  beforeEach(() => {
    setAuthenticatedUser({ role: Role.ADMIN });
  });

  it('renders airport list copy in English', async () => {
    server.use(http.get('/api/v1/airport/get-all', () => HttpResponse.json(airports)));

    renderWithRoute(<AirportListPage />, { route: '/airports', path: '/airports' });

    expect(await screen.findByRole('heading', { name: 'Airport management' })).toBeInTheDocument();
    expect(screen.getByText('Create airport')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Airport' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });

  it('shows airport form validation messages in English', async () => {
    const user = userEvent.setup();

    renderWithRoute(<AirportFormPage />, { route: '/airports/create', path: '/airports/create' });

    await user.click(screen.getByRole('button', { name: 'Create airport' }));

    expect(await screen.findByText('Airport code must be at least 2 characters')).toBeInTheDocument();
    expect(screen.getByText('Airport name must be at least 2 characters')).toBeInTheDocument();
    expect(screen.getByText('Address is required')).toBeInTheDocument();
  });

  it('renders aircraft list copy in English', async () => {
    server.use(http.get('/api/v1/aircraft/get-all', () => HttpResponse.json(aircrafts)));

    renderWithRoute(<AircraftListPage />, { route: '/aircrafts', path: '/aircrafts' });

    expect(await screen.findByRole('heading', { name: 'Aircraft management' })).toBeInTheDocument();
    expect(screen.getByText('Create aircraft')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Aircraft' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });

  it('shows aircraft form validation messages in English', async () => {
    const user = userEvent.setup();

    renderWithRoute(<AircraftFormPage />, { route: '/aircrafts/create', path: '/aircrafts/create' });

    await user.click(screen.getByRole('button', { name: 'Create aircraft' }));

    expect(await screen.findByText('Aircraft name is required')).toBeInTheDocument();
    expect(screen.getByText('Model is required')).toBeInTheDocument();
  });
});
