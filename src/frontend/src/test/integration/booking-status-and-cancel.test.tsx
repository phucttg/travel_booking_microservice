import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { BookingDetailPage } from '@pages/bookings/BookingDetailPage';
import { BookingListPage } from '@pages/bookings/BookingListPage';
import { server } from '@/test/msw/server';
import { renderWithRoute } from '@/test/utils';
import { aircrafts, airports, makeBooking, makeFlight, setAuthenticatedUser } from '@/test/frontend.fixtures';
import { BookingStatus, FlightStatus } from '@/types/enums';

describe('booking status and cancellation flows', () => {
  beforeEach(() => {
    setAuthenticatedUser();
  });

  it(
    'shows booking statuses and refreshes the list after cancel',
    async () => {
      const user = userEvent.setup();
      const cancelTimestamp = '2099-03-01T09:00:00';
      let bookings = [
        makeBooking({ id: 1, bookingStatus: BookingStatus.CONFIRMED, canceledAt: null }),
        makeBooking({
          id: 2,
          flightNumber: 'VN222',
          bookingStatus: BookingStatus.CANCELED,
          canceledAt: cancelTimestamp
        })
      ];

      server.use(
        http.get('/api/v1/airport/get-all', () => HttpResponse.json(airports)),
        http.get('/api/v1/booking/get-all', () =>
          HttpResponse.json({
            result: bookings,
            total: bookings.length
          })
        ),
        http.patch('/api/v1/booking/cancel/:id', ({ params }) => {
          const id = Number(params.id);
          bookings = bookings.map((booking) =>
            booking.id === id
              ? {
                  ...booking,
                  bookingStatus: BookingStatus.CANCELED,
                  canceledAt: cancelTimestamp,
                  updatedAt: cancelTimestamp
                }
              : booking
          );

          return new HttpResponse(null, { status: 204 });
        })
      );

      renderWithRoute(<BookingListPage />, { route: '/bookings', path: '/bookings' });

      expect((await screen.findAllByText('Confirmed')).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Canceled').length).toBeGreaterThanOrEqual(1);

      const cancelButton = document.querySelector(
        '.ant-table .ant-btn-dangerous'
      ) as HTMLButtonElement | null;

      expect(cancelButton).not.toBeNull();

      await user.click(cancelButton as HTMLButtonElement);
      await user.click(await screen.findByRole('button', { name: 'Hủy booking' }));

      expect((await screen.findAllByText('Canceled')).length).toBeGreaterThanOrEqual(2);
      expect(document.querySelector('.ant-table .ant-btn-dangerous')).toBeNull();
    },
    10000
  );

  it('updates booking detail status and canceledAt after cancel', async () => {
    const user = userEvent.setup();
    const cancelTimestamp = '2099-03-01T09:00:00';
    let booking = makeBooking({
      id: 7,
      bookingStatus: BookingStatus.CONFIRMED,
      canceledAt: null
    });
    const flight = makeFlight({
      id: 1,
      flightStatus: FlightStatus.SCHEDULED
    });

    server.use(
      http.get('/api/v1/airport/get-all', () => HttpResponse.json(airports)),
      http.get('/api/v1/aircraft/get-all', () => HttpResponse.json(aircrafts)),
      http.get('/api/v1/booking/get-by-id', () => HttpResponse.json(booking)),
      http.get('/api/v1/flight/get-by-id', () => HttpResponse.json(flight)),
      http.patch('/api/v1/booking/cancel/:id', () => {
        booking = {
          ...booking,
          bookingStatus: BookingStatus.CANCELED,
          canceledAt: cancelTimestamp,
          updatedAt: cancelTimestamp
        };

        return new HttpResponse(null, { status: 204 });
      })
    );

    renderWithRoute(<BookingDetailPage />, { route: '/bookings/7', path: '/bookings/:id' });

    expect((await screen.findAllByText('Confirmed')).length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByRole('button', { name: 'Hủy booking' }));

    expect((await screen.findAllByText('Canceled')).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('01/03/2099 09:00')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy booking' })).not.toBeInTheDocument();
  });
});
