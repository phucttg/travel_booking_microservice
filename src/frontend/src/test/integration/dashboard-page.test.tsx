import { screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { DashboardPage } from '@pages/dashboard/DashboardPage';
import { server } from '@/test/msw/server';
import { renderWithRoute } from '@/test/utils';
import { airports, makeBooking, makeFlight, setAuthenticatedUser } from '@/test/frontend.fixtures';
import { BookingStatus, FlightStatus, Role } from '@/types/enums';
import { formatCurrency } from '@utils/format';

const toCurrencyRegex = (amount: number, currency = 'VND') =>
  new RegExp(formatCurrency(amount, currency).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));

describe('dashboard page', () => {
  it('keeps query strip in Ready state when totals are zero', async () => {
    setAuthenticatedUser({ role: Role.ADMIN });
    let includePaymentSummaryParam: string | null = null;

    server.use(
      http.get('/api/v1/airport/get-all', () => HttpResponse.json(airports)),
      http.get('/api/v1/user/get', () =>
        HttpResponse.json({
          result: [],
          total: 0
        })
      ),
      http.get('/api/v1/passenger/get-all', () =>
        HttpResponse.json({
          result: [],
          total: 0
        })
      ),
      http.get('/api/v1/flight/get-all', () =>
        HttpResponse.json({
          result: [],
          total: 0
        })
      ),
      http.get('/api/v1/booking/get-all', ({ request }) => {
        includePaymentSummaryParam = new URL(request.url).searchParams.get('includePaymentSummary');
        return HttpResponse.json({
          result: [],
          total: 0
        });
      })
    );

    renderWithRoute(<DashboardPage />, { route: '/dashboard', path: '/dashboard' });

    expect(await screen.findByText('Identity · Ready')).toBeInTheDocument();
    expect(screen.getByText('Flights · Ready')).toBeInTheDocument();
    expect(screen.getByText('Bookings · Ready')).toBeInTheDocument();
    expect(screen.getByText('Passengers · Ready')).toBeInTheDocument();
    expect(screen.getByText('Analytics · Ready')).toBeInTheDocument();
    expect(includePaymentSummaryParam).toBe('false');

    const metricsGrid = screen.getByTestId('dashboard-metrics-grid');
    expect(within(metricsGrid).getAllByTestId(/dashboard-metric-/)).toHaveLength(5);
  });

  it('keeps same-day upcoming flights visible by using departureDate fallback', async () => {
    setAuthenticatedUser({ role: Role.ADMIN });

    const now = Date.now();
    const sameDayDateOnly = new Date(now).toISOString().slice(0, 10);
    const flightWithDateOnly = makeFlight({
      id: 777,
      flightNumber: 'VN777',
      flightStatus: FlightStatus.SCHEDULED,
      flightDate: sameDayDateOnly,
      departureDate: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
      arriveDate: new Date(now + 4 * 60 * 60 * 1000).toISOString()
    });

    server.use(
      http.get('/api/v1/airport/get-all', () => HttpResponse.json(airports)),
      http.get('/api/v1/user/get', () =>
        HttpResponse.json({
          result: [],
          total: 0
        })
      ),
      http.get('/api/v1/passenger/get-all', () =>
        HttpResponse.json({
          result: [],
          total: 0
        })
      ),
      http.get('/api/v1/flight/get-all', () =>
        HttpResponse.json({
          result: [flightWithDateOnly],
          total: 1
        })
      ),
      http.get('/api/v1/booking/get-all', () =>
        HttpResponse.json({
          result: [],
          total: 0
        })
      )
    );

    renderWithRoute(<DashboardPage />, { route: '/dashboard', path: '/dashboard' });

    expect(await screen.findByText('VN777')).toBeInTheDocument();
  });

  it('labels upcoming flight prices as base fare', async () => {
    setAuthenticatedUser({ role: Role.ADMIN });

    const upcomingFlight = makeFlight({
      id: 888,
      flightNumber: 'VN888',
      flightStatus: FlightStatus.SCHEDULED,
      price: 1750000,
      departureDate: '2099-03-10T08:00:00.000Z',
      arriveDate: '2099-03-10T10:00:00.000Z'
    });

    server.use(
      http.get('/api/v1/airport/get-all', () => HttpResponse.json(airports)),
      http.get('/api/v1/user/get', () =>
        HttpResponse.json({
          result: [],
          total: 0
        })
      ),
      http.get('/api/v1/passenger/get-all', () =>
        HttpResponse.json({
          result: [],
          total: 0
        })
      ),
      http.get('/api/v1/flight/get-all', () =>
        HttpResponse.json({
          result: [upcomingFlight],
          total: 1
        })
      ),
      http.get('/api/v1/booking/get-all', () =>
        HttpResponse.json({
          result: [],
          total: 0
        })
      )
    );

    renderWithRoute(<DashboardPage />, { route: '/dashboard', path: '/dashboard' });

    expect(await screen.findByText('VN888')).toBeInTheDocument();
    expect(screen.getByText('Base fare')).toBeInTheDocument();
    expect(screen.getByText(toCurrencyRegex(upcomingFlight.price))).toBeInTheDocument();
  });

  it('renders the non-admin flight snapshot directly from the shared flight list endpoint', async () => {
    setAuthenticatedUser({ role: Role.USER });

    const visibleFlight = makeFlight({
      id: 555,
      flightNumber: 'VN555',
      flightStatus: FlightStatus.SCHEDULED
    });

    server.use(
      http.get('/api/v1/airport/get-all', () => HttpResponse.json(airports)),
      http.get('/api/v1/flight/get-all', () =>
        HttpResponse.json({
          result: [visibleFlight],
          total: 1
        })
      ),
      http.get('/api/v1/booking/get-all', () =>
        HttpResponse.json({
          result: [],
          total: 0
        })
      )
    );

    renderWithRoute(<DashboardPage />, { route: '/dashboard', path: '/dashboard' });

    expect(await screen.findByText('Traveler overview')).toBeInTheDocument();
    expect(screen.queryByText('Operations overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Module status')).not.toBeInTheDocument();
    expect(screen.getByText('Your trips')).toBeInTheDocument();
    expect(screen.getByText('My recent bookings')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Browse flights' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'View bookings' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'My wallet' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create booking' })).not.toBeInTheDocument();
    expect(await screen.findByText('Available flight records you can browse and book from here.')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders compact revenue metric using K/M/B unit', async () => {
    setAuthenticatedUser({ role: Role.ADMIN });

    server.use(
      http.get('/api/v1/airport/get-all', () => HttpResponse.json(airports)),
      http.get('/api/v1/user/get', () =>
        HttpResponse.json({
          result: [],
          total: 0
        })
      ),
      http.get('/api/v1/passenger/get-all', () =>
        HttpResponse.json({
          result: [],
          total: 0
        })
      ),
      http.get('/api/v1/flight/get-all', () =>
        HttpResponse.json({
          result: [],
          total: 0
        })
      ),
      http.get('/api/v1/booking/get-all', () =>
        HttpResponse.json({
          result: [
            makeBooking({ id: 1, price: 15_250_000, bookingStatus: BookingStatus.CONFIRMED }),
            makeBooking({ id: 2, price: 0, bookingStatus: BookingStatus.CANCELED })
          ],
          total: 2
        })
      )
    );

    renderWithRoute(<DashboardPage />, { route: '/dashboard', path: '/dashboard' });

    const revenueCard = await screen.findByTestId('dashboard-metric-revenue');
    expect(await within(revenueCard).findByText(/M đ$/)).toBeInTheDocument();
  });
});
