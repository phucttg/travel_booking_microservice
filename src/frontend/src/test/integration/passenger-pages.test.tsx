import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { PassengerDetailPage } from '@pages/passengers/PassengerDetailPage';
import { PassengerListPage } from '@pages/passengers/PassengerListPage';
import { server } from '@/test/msw/server';
import { renderWithRoute } from '@/test/utils';
import { makePassenger, setAuthenticatedUser } from '@/test/frontend.fixtures';
import { PassengerType, Role } from '@/types/enums';

describe('passenger pages', () => {
  beforeEach(() => {
    setAuthenticatedUser({ role: Role.ADMIN });
  });

  it('renders passengerType in the passenger list', async () => {
    const passenger = makePassenger({
      id: 9,
      name: 'Baby Guest',
      passengerType: PassengerType.BABY
    });

    server.use(
      http.get('/api/v1/passenger/get-all', () =>
        HttpResponse.json({
          result: [passenger],
          total: 1
        })
      )
    );

    renderWithRoute(<PassengerListPage />, { route: '/passengers', path: '/passengers' });

    expect(await screen.findByRole('heading', { name: 'Passenger list' })).toBeInTheDocument();
    expect(await screen.findByText('Baby Guest')).toBeInTheDocument();
    expect(screen.getByText('Baby')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by name')).toBeInTheDocument();
  });

  it('renders passengerType in the passenger detail page', async () => {
    const passenger = makePassenger({
      id: 9,
      name: 'Baby Guest',
      passengerType: PassengerType.BABY
    });

    server.use(http.get('/api/v1/passenger/get-by-id', () => HttpResponse.json(passenger)));

    renderWithRoute(<PassengerDetailPage />, {
      route: '/passengers/9',
      path: '/passengers/:id'
    });

    expect((await screen.findAllByText('Passenger details')).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText(/Passenger type Baby/)).toBeInTheDocument();
    expect(screen.getAllByText('Baby').length).toBeGreaterThanOrEqual(1);
  });
});
