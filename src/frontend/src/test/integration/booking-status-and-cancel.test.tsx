import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { BookingDetailPage } from '@pages/bookings/BookingDetailPage';
import { BookingListPage } from '@pages/bookings/BookingListPage';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { server } from '@/test/msw/server';
import { createTestQueryClient, renderWithRoute } from '@/test/utils';
import { aircrafts, airports, makeBooking, makeFlight, makePayment, setAuthenticatedUser } from '@/test/frontend.fixtures';
import { BookingStatus, FlightStatus, PaymentStatus } from '@/types/enums';

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
      await user.click(await screen.findByRole('button', { name: 'Cancel booking' }));

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
    await user.click(await screen.findByRole('button', { name: 'Hủy booking' }));

    expect((await screen.findAllByText('Canceled')).length).toBeGreaterThanOrEqual(1);
    expect((await screen.findAllByText('01/03/2099 09:00')).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('button', { name: 'Hủy booking' })).not.toBeInTheDocument();
  });

  it('shows wallet payment button for pending booking and navigates to create page with bookingId', async () => {
    const user = userEvent.setup();
    const pendingBooking = makeBooking({
      id: 9,
      bookingStatus: BookingStatus.PENDING_PAYMENT,
      paymentId: 901,
      paymentSummary: null
    });
    const flight = makeFlight({
      id: 1,
      flightStatus: FlightStatus.SCHEDULED
    });

    const LocationProbe = () => {
      const location = useLocation();

      return <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>;
    };

    server.use(
      http.get('/api/v1/airport/get-all', () => HttpResponse.json(airports)),
      http.get('/api/v1/aircraft/get-all', () => HttpResponse.json(aircrafts)),
      http.get('/api/v1/booking/get-by-id', () => HttpResponse.json(pendingBooking)),
      http.get('/api/v1/flight/get-by-id', () => HttpResponse.json(flight)),
      http.get('/api/v1/payment/get-by-id', () =>
        HttpResponse.json(
          makePayment({
            id: 901,
            bookingId: 9,
            paymentStatus: PaymentStatus.PENDING
          })
        )
      )
    );

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={['/bookings/9']}>
          <Routes>
            <Route path="/bookings/:id" element={<BookingDetailPage />} />
            <Route path="/bookings/create" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await user.click(await screen.findByRole('button', { name: 'Thanh toán ví' }));
    expect(await screen.findByTestId('location-probe')).toHaveTextContent('/bookings/create?bookingId=9');
  });

  it('hides wallet payment button when pending booking already has succeeded payment', async () => {
    const pendingBookingWithSucceededPayment = makeBooking({
      id: 10,
      bookingStatus: BookingStatus.PENDING_PAYMENT,
      paymentId: 902,
      paymentSummary: null
    });
    const flight = makeFlight({
      id: 1,
      flightStatus: FlightStatus.SCHEDULED
    });

    server.use(
      http.get('/api/v1/airport/get-all', () => HttpResponse.json(airports)),
      http.get('/api/v1/aircraft/get-all', () => HttpResponse.json(aircrafts)),
      http.get('/api/v1/booking/get-by-id', () => HttpResponse.json(pendingBookingWithSucceededPayment)),
      http.get('/api/v1/flight/get-by-id', () => HttpResponse.json(flight)),
      http.get('/api/v1/payment/get-by-id', () =>
        HttpResponse.json(
          makePayment({
            id: 902,
            bookingId: 10,
            paymentStatus: PaymentStatus.SUCCEEDED
          })
        )
      )
    );

    renderWithRoute(<BookingDetailPage />, { route: '/bookings/10', path: '/bookings/:id' });

    expect(await screen.findByText('Chi tiết Booking #10')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thanh toán ví' })).not.toBeInTheDocument();
  });
});
