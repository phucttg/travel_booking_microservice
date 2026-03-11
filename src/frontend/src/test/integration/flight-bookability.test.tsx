import { screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { FlightDetailPage } from '@pages/flights/FlightDetailPage';
import { FlightListPage } from '@pages/flights/FlightListPage';
import { server } from '@/test/msw/server';
import { renderWithRoute } from '@/test/utils';
import { aircrafts, airports, makeFlight, makeSeat, setAuthenticatedUser } from '@/test/frontend.fixtures';
import { FlightStatus } from '@/types/enums';

describe('flight booking availability surfaces', () => {
  beforeEach(() => {
    setAuthenticatedUser();
  });

  it('disables the booking CTA in the flight list for invalid flights', async () => {
    const validFlight = makeFlight({ id: 1, flightNumber: 'VN123', flightStatus: FlightStatus.SCHEDULED });
    const invalidFlight = makeFlight({ id: 2, flightNumber: 'VN404', flightStatus: FlightStatus.CANCELED });

    server.use(
      http.get('/api/v1/airport/get-all', () => HttpResponse.json(airports)),
      http.get('/api/v1/aircraft/get-all', () => HttpResponse.json(aircrafts)),
      http.get('/api/v1/flight/get-all', () =>
        HttpResponse.json({
          result: [validFlight, invalidFlight],
          total: 2
        })
      )
    );

    renderWithRoute(<FlightListPage />, { route: '/flights', path: '/flights' });

    await screen.findByText('VN404');

    const tableButtons = within(screen.getByRole('table')).getAllByRole('button');

    expect(tableButtons[1]).toBeEnabled();
    expect(tableButtons[3]).toBeDisabled();
  });

  it('disables the booking CTA in the flight detail page for invalid flights', async () => {
    const invalidFlight = makeFlight({ id: 9, flightNumber: 'VN909', flightStatus: FlightStatus.COMPLETED });

    server.use(
      http.get('/api/v1/airport/get-all', () => HttpResponse.json(airports)),
      http.get('/api/v1/aircraft/get-all', () => HttpResponse.json(aircrafts)),
      http.get('/api/v1/flight/get-by-id', () => HttpResponse.json(invalidFlight)),
      http.get('/api/v1/seat/get-available-seats', () => HttpResponse.json([makeSeat({ flightId: 9 })]))
    );

    renderWithRoute(<FlightDetailPage />, { route: '/flights/9', path: '/flights/:id' });

    expect(await screen.findByText('VN909')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đặt vé' })).toBeDisabled();
  });
});
