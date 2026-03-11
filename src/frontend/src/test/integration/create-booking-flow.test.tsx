import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { CreateBookingPage } from '@pages/bookings/CreateBookingPage';
import { server } from '@/test/msw/server';
import { renderWithRoute } from '@/test/utils';
import {
  aircrafts,
  airports,
  makeBooking,
  makeFlight,
  makePassenger,
  makeSeat,
  setAuthenticatedUser
} from '@/test/frontend.fixtures';
import { FlightStatus } from '@/types/enums';

const mockCreateBookingDependencies = ({
  flights,
  selectedFlight,
  seats = [makeSeat()],
  passenger = makePassenger()
}: {
  flights: ReturnType<typeof makeFlight>[];
  selectedFlight: ReturnType<typeof makeFlight>;
  seats?: ReturnType<typeof makeSeat>[];
  passenger?: ReturnType<typeof makePassenger>;
}) => {
  server.use(
    http.get('/api/v1/airport/get-all', () => HttpResponse.json(airports)),
    http.get('/api/v1/aircraft/get-all', () => HttpResponse.json(aircrafts)),
    http.get('/api/v1/flight/get-all', () =>
      HttpResponse.json({
        result: flights,
        total: flights.length
      })
    ),
    http.get('/api/v1/flight/get-by-id', ({ request }) => {
      const id = Number(new URL(request.url).searchParams.get('id'));
      const flight = [selectedFlight, ...flights].find((entry) => entry.id === id) || selectedFlight;
      return HttpResponse.json(flight);
    }),
    http.get('/api/v1/seat/get-available-seats', () => HttpResponse.json(seats)),
    http.get('/api/v1/passenger/get-by-user-id', () => HttpResponse.json(passenger)),
    http.get('/api/v1/booking/get-all', () =>
      HttpResponse.json({
        result: [makeBooking()],
        total: 1
      })
    )
  );
};

describe('create booking flow', () => {
  beforeEach(() => {
    setAuthenticatedUser();
  });

  it('shows a warning and blocks the deep link flow for invalid flights', async () => {
    const invalidFlight = makeFlight({
      id: 2,
      flightNumber: 'VN000',
      flightStatus: FlightStatus.CANCELED
    });
    const validFlight = makeFlight({
      id: 1,
      flightNumber: 'VN123',
      flightStatus: FlightStatus.SCHEDULED
    });

    mockCreateBookingDependencies({
      flights: [validFlight, invalidFlight],
      selectedFlight: invalidFlight
    });

    renderWithRoute(<CreateBookingPage />, {
      route: '/bookings/create?flightId=2',
      path: '/bookings/create'
    });

    expect(await screen.findByText('Chuyến bay từ deep link hiện không còn mở đặt vé')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chọn chuyến bay' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Chọn ghế' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Không thể đặt' })).toBeDisabled();
  });

  it(
    'creates a booking without sending passengerId from the client payload',
    async () => {
    const user = userEvent.setup();
    const selectedFlight = makeFlight({ id: 1, flightNumber: 'VN321' });
    const createdBooking = makeBooking({ id: 99, flightId: 1, flightNumber: 'VN321' });
    const submittedPayloads: unknown[] = [];

    mockCreateBookingDependencies({
      flights: [selectedFlight],
      selectedFlight,
      seats: [makeSeat({ id: 10, flightId: 1, seatNumber: '1A' })]
    });

    server.use(
      http.post('/api/v1/booking/create', async ({ request }) => {
        submittedPayloads.push(await request.json());
        return HttpResponse.json(createdBooking);
      })
    );

    renderWithRoute(<CreateBookingPage />, {
      route: '/bookings/create',
      path: '/bookings/create'
    });

      await user.click(await screen.findByRole('button', { name: 'Chọn chuyến' }));
      await user.click(await screen.findByRole('button', { name: '1A' }));
      await user.click(screen.getByRole('button', { name: 'Tiếp tục review' }));
      await user.click(await screen.findByRole('button', { name: 'Đặt vé ngay' }));

      await waitFor(() => {
        expect(submittedPayloads).toEqual([
          {
            flightId: 1,
            description: 'N/A',
            seatNumber: '1A'
          }
        ]);
      });
    },
    10000
  );
});
