import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { message } from 'antd';
import { HttpResponse, http } from 'msw';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { CreateBookingPage } from '@pages/bookings/CreateBookingPage';
import { server } from '@/test/msw/server';
import { renderWithRoute } from '@/test/utils';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import {
  aircrafts,
  airports,
  makeBooking,
  makeBookingCheckout,
  makeFlight,
  makePassenger,
  makePayment,
  makeSeat,
  setAuthenticatedUser
} from '@/test/frontend.fixtures';
import { BookingStatus, FlightStatus, PaymentStatus, SeatClass } from '@/types/enums';
import { formatCurrency } from '@utils/format';

const toCurrencyRegex = (amount: number, currency = 'VND') =>
  new RegExp(formatCurrency(amount, currency).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
} as const;
const CI_FLAKY_TEST_TIMEOUT_MS = 15000;

type RequestCounts = {
  flightById: number;
  seatInventory: number;
  walletMe: number;
};

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
  const requestCounts: RequestCounts = {
    flightById: 0,
    seatInventory: 0,
    walletMe: 0
  };

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
      requestCounts.flightById += 1;
      const id = Number(new URL(request.url).searchParams.get('id'));
      const flight = [selectedFlight, ...flights].find((entry) => entry.id === id) || selectedFlight;
      return HttpResponse.json(flight);
    }),
    http.get('/api/v1/seat/get-available-seats', () => {
      requestCounts.seatInventory += 1;
      return HttpResponse.json(seats);
    }),
    http.get('/api/v1/passenger/get-by-user-id', () => HttpResponse.json(passenger)),
    http.get('/api/v1/wallet/me', () => {
      requestCounts.walletMe += 1;
      return HttpResponse.json({
        userId: 42,
        balance: 10000000,
        currency: 'VND',
        createdAt: '2099-03-10T07:00:00.000Z',
        updatedAt: '2099-03-10T07:00:00.000Z'
      });
    }),
    http.get('/api/v1/booking/get-all', () =>
      HttpResponse.json({
        result: [makeBooking()],
        total: 1
      })
    )
  );

  return requestCounts;
};

const renderCreateBookingWithRetryClient = (route = '/bookings/create') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false
      },
      mutations: {
        retry: false
      }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]} future={ROUTER_FUTURE_FLAGS}>
        <Routes>
          <Route path="/bookings/create" element={<CreateBookingPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const renderCreateBookingWithLocationProbe = (route = '/bookings/create') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false
      },
      mutations: {
        retry: false
      }
    }
  });

  const LocationProbe = () => {
    const location = useLocation();
    return <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>;
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]} future={ROUTER_FUTURE_FLAGS}>
        <LocationProbe />
        <Routes>
          <Route path="/bookings/create" element={<CreateBookingPage />} />
          <Route path="/bookings/:id" element={<div>Booking detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('create booking flow', () => {
  beforeEach(() => {
    setAuthenticatedUser();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it(
    'shows a warning and blocks the deep link flow for invalid flights',
    async () => {
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

      const requestCounts = mockCreateBookingDependencies({
        flights: [validFlight, invalidFlight],
        selectedFlight: invalidFlight
      });

      renderWithRoute(<CreateBookingPage />, {
        route: '/bookings/create?flightId=2',
        path: '/bookings/create'
      });

      expect(await screen.findByText('The deep-linked flight is no longer open for booking')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Select a flight' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Select a seat' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
      expect(requestCounts.flightById).toBe(0);
      expect(requestCounts.seatInventory).toBe(0);
      expect(requestCounts.walletMe).toBe(0);
    },
    10000
  );

  it('renders every flight returned by backend without extra past-flight filtering', async () => {
    const futureFlight = makeFlight({
      id: 1,
      flightNumber: 'VN123',
      departureDate: '2099-03-10T08:00:00.000Z',
      arriveDate: '2099-03-10T10:00:00.000Z'
    });
    const pastFlight = makeFlight({
      id: 2,
      flightNumber: 'VN002',
      departureDate: '2000-03-10T08:00:00.000Z',
      arriveDate: '2000-03-10T10:00:00.000Z'
    });

    mockCreateBookingDependencies({
      flights: [futureFlight, pastFlight],
      selectedFlight: futureFlight
    });

    renderWithRoute(<CreateBookingPage />, {
      route: '/bookings/create',
      path: '/bookings/create'
    });

    expect(await screen.findByText('VN123')).toBeInTheDocument();
    expect(screen.getByText('VN002')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
  });

  it(
    'freezes payment actions after succeeded and still confirms booking when confirmation is delayed',
    async () => {
      const user = userEvent.setup();
      const selectedFlight = makeFlight({ id: 1, flightNumber: 'VN321' });
      const checkout = makeBookingCheckout(
        {},
        {
          id: 99,
          flightId: 1,
          flightNumber: 'VN321',
          bookingStatus: BookingStatus.PENDING_PAYMENT,
          paymentId: 91
        },
        {
          id: 91,
          bookingId: 99,
          paymentStatus: PaymentStatus.PENDING
        }
      );
      const confirmedPayment = makePayment({
        id: 91,
        bookingId: 99,
        paymentStatus: PaymentStatus.SUCCEEDED
      });
      const pendingBooking = makeBooking({
        id: 99,
        flightId: 1,
        flightNumber: 'VN321',
        bookingStatus: BookingStatus.PENDING_PAYMENT,
        paymentId: 91
      });
      const confirmedBooking = makeBooking({
        id: 99,
        flightId: 1,
        flightNumber: 'VN321',
        bookingStatus: BookingStatus.CONFIRMED,
        paymentId: 91
      });
      const submittedPayloads: unknown[] = [];
      let paymentAfterWalletPay = checkout.payment;
      let bookingSyncCalls = 0;

      mockCreateBookingDependencies({
        flights: [selectedFlight],
        selectedFlight,
        seats: [makeSeat({ id: 10, flightId: 1, seatNumber: '1A' })]
      });

      server.use(
        http.post('/api/v1/booking/create', async ({ request }) => {
          submittedPayloads.push(await request.json());
          return HttpResponse.json(checkout);
        }),
        http.post('/api/v1/wallet/pay-booking', () => {
          paymentAfterWalletPay = confirmedPayment;
          return HttpResponse.json({
            payment: confirmedPayment,
            wallet: {
              userId: 42,
              balance: 7375000,
              currency: 'VND',
              createdAt: '2099-03-10T07:00:00.000Z',
              updatedAt: '2099-03-10T07:01:00.000Z'
            }
          });
        }),
        http.get('/api/v1/payment/get-by-id', () => HttpResponse.json(paymentAfterWalletPay)),
        http.get('/api/v1/booking/get-by-id', () => {
          bookingSyncCalls += 1;
          return HttpResponse.json(bookingSyncCalls < 4 ? pendingBooking : confirmedBooking);
        })
      );

      renderWithRoute(<CreateBookingPage />, {
        route: '/bookings/create',
        path: '/bookings/create'
      });

      await user.click(await screen.findByRole('button', { name: 'Select flight' }));
      await user.click(await screen.findByRole('button', { name: '1A' }));
      await user.click(screen.getByRole('button', { name: 'Continue to review' }));
      await user.click(await screen.findByRole('button', { name: 'Continue to wallet payment' }));

      await waitFor(() => {
        expect(submittedPayloads).toEqual([
          {
            flightId: 1,
            description: 'N/A',
            seatNumber: '1A'
          }
        ]);
      });

      expect(await screen.findByText('Locked total')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Pay with wallet' }));

      expect(await screen.findByText('Payment received, confirming booking')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Back to review' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Refresh wallet' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Top up wallet' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Pay with wallet' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Recheck payment' })).not.toBeInTheDocument();

      expect(await screen.findByText('Booking #99', undefined, { timeout: 10000 })).toBeInTheDocument();
      expect(bookingSyncCalls).toBeGreaterThanOrEqual(4);
    },
    15000
  );

  it(
    'shows timeout safe exit and keeps payment step read-only when booking confirmation exceeds 45 seconds',
    async () => {
      const user = userEvent.setup();
      const selectedFlight = makeFlight({ id: 1, flightNumber: 'VN322' });
      const checkout = makeBookingCheckout(
        {},
        {
          id: 100,
          flightId: 1,
          flightNumber: 'VN322',
          bookingStatus: BookingStatus.PENDING_PAYMENT,
          paymentId: 92
        },
        {
          id: 92,
          bookingId: 100,
          paymentStatus: PaymentStatus.PENDING
        }
      );
      const confirmedPayment = makePayment({
        id: 92,
        bookingId: 100,
        paymentStatus: PaymentStatus.SUCCEEDED
      });
      const pendingBooking = makeBooking({
        id: 100,
        flightId: 1,
        flightNumber: 'VN322',
        bookingStatus: BookingStatus.PENDING_PAYMENT,
        paymentId: 92
      });
      let paymentAfterWalletPay = checkout.payment;

      mockCreateBookingDependencies({
        flights: [selectedFlight],
        selectedFlight,
        seats: [makeSeat({ id: 11, flightId: 1, seatNumber: '1A' })]
      });

      server.use(
        http.post('/api/v1/booking/create', () => HttpResponse.json(checkout)),
        http.post('/api/v1/wallet/pay-booking', () => {
          paymentAfterWalletPay = confirmedPayment;
          return HttpResponse.json({
            payment: confirmedPayment,
            wallet: {
              userId: 42,
              balance: 7375000,
              currency: 'VND',
              createdAt: '2099-03-10T07:00:00.000Z',
              updatedAt: '2099-03-10T07:01:00.000Z'
            }
          });
        }),
        http.get('/api/v1/payment/get-by-id', () => HttpResponse.json(paymentAfterWalletPay)),
        http.get('/api/v1/booking/get-by-id', () => HttpResponse.json(pendingBooking))
      );

      renderWithRoute(<CreateBookingPage />, {
        route: '/bookings/create',
        path: '/bookings/create'
      });

      await user.click(await screen.findByRole('button', { name: 'Select flight' }));
      await user.click(await screen.findByRole('button', { name: '1A' }));
      await user.click(screen.getByRole('button', { name: 'Continue to review' }));
      await user.click(await screen.findByRole('button', { name: 'Continue to wallet payment' }));

      vi.useFakeTimers();
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Pay with wallet' }));
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByText('Payment received, confirming booking')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(46000);
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('Booking confirmation is delayed')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to booking details' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Back to review' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Refresh wallet' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Pay with wallet' })).not.toBeInTheDocument();
      expect(screen.queryByText('Booking not found')).not.toBeInTheDocument();
    },
    20000
  );

  it(
    'pushes history state again when browser back is triggered during syncing',
    async () => {
      const user = userEvent.setup();
      const pushStateSpy = vi.spyOn(window.history, 'pushState');
      const selectedFlight = makeFlight({ id: 1, flightNumber: 'VN323' });
      const checkout = makeBookingCheckout(
        {},
        {
          id: 101,
          flightId: 1,
          flightNumber: 'VN323',
          bookingStatus: BookingStatus.PENDING_PAYMENT,
          paymentId: 93
        },
        {
          id: 93,
          bookingId: 101,
          paymentStatus: PaymentStatus.PENDING
        }
      );
      const confirmedPayment = makePayment({
        id: 93,
        bookingId: 101,
        paymentStatus: PaymentStatus.SUCCEEDED
      });
      const pendingBooking = makeBooking({
        id: 101,
        flightId: 1,
        flightNumber: 'VN323',
        bookingStatus: BookingStatus.PENDING_PAYMENT,
        paymentId: 93
      });
      let paymentAfterWalletPay = checkout.payment;

      mockCreateBookingDependencies({
        flights: [selectedFlight],
        selectedFlight,
        seats: [makeSeat({ id: 12, flightId: 1, seatNumber: '1A' })]
      });

      server.use(
        http.post('/api/v1/booking/create', () => HttpResponse.json(checkout)),
        http.post('/api/v1/wallet/pay-booking', () => {
          paymentAfterWalletPay = confirmedPayment;
          return HttpResponse.json({
            payment: confirmedPayment,
            wallet: {
              userId: 42,
              balance: 7375000,
              currency: 'VND',
              createdAt: '2099-03-10T07:00:00.000Z',
              updatedAt: '2099-03-10T07:01:00.000Z'
            }
          });
        }),
        http.get('/api/v1/payment/get-by-id', () => HttpResponse.json(paymentAfterWalletPay)),
        http.get('/api/v1/booking/get-by-id', () => HttpResponse.json(pendingBooking))
      );

      renderWithRoute(<CreateBookingPage />, {
        route: '/bookings/create',
        path: '/bookings/create'
      });

      await user.click(await screen.findByRole('button', { name: 'Select flight' }));
      await user.click(await screen.findByRole('button', { name: '1A' }));
      await user.click(screen.getByRole('button', { name: 'Continue to review' }));
      await user.click(await screen.findByRole('button', { name: 'Continue to wallet payment' }));
      await user.click(await screen.findByRole('button', { name: 'Pay with wallet' }));
      expect(await screen.findByText('Syncing booking, please wait')).toBeInTheDocument();

      const callsBeforePop = pushStateSpy.mock.calls.length;
      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      await waitFor(() => {
        expect(pushStateSpy.mock.calls.length).toBeGreaterThan(callsBeforePop);
      });
    },
    10000
  );

  it('allows submitting without seat selection and presents flight.price as base fare', async () => {
    const user = userEvent.setup();
    const selectedFlight = makeFlight({ id: 1, flightNumber: 'VN555', price: 1500000 });
    const checkout = makeBookingCheckout(
      {},
      {
        id: 77,
        flightId: 1,
        flightNumber: 'VN555',
        seatNumber: '3A',
        seatClass: SeatClass.ECONOMY,
        price: 1500000,
        paymentId: 701
      },
      {
        id: 701,
        bookingId: 77,
        amount: 1500000,
        paymentStatus: PaymentStatus.PENDING
      }
    );
    const submittedPayloads: unknown[] = [];

    mockCreateBookingDependencies({
      flights: [selectedFlight],
      selectedFlight,
      seats: [
        makeSeat({
          id: 10,
          flightId: 1,
          seatNumber: '3A',
          seatClass: SeatClass.ECONOMY,
          price: 1500000
        })
      ]
    });

    server.use(
      http.post('/api/v1/booking/create', async ({ request }) => {
        submittedPayloads.push(await request.json());
        return HttpResponse.json(checkout);
      }),
      http.get('/api/v1/payment/get-by-id', () => HttpResponse.json(checkout.payment))
    );

    renderWithRoute(<CreateBookingPage />, {
      route: '/bookings/create',
      path: '/bookings/create'
    });

    expect((await screen.findAllByText('Base fare')).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Select flight' }));
    expect(await screen.findByText('You can skip seat selection and auto-assign Economy')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continue to review' }));

    expect((await screen.findAllByText('Base fare')).length).toBeGreaterThan(0);
    expect(
      screen.getByText('The final total will lock after seat assignment. Business and First Class require manual selection.')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continue to wallet payment' }));

    await waitFor(() => {
      expect(submittedPayloads).toEqual([
        {
          flightId: 1,
          description: 'N/A'
        }
      ]);
    });

    expect(await screen.findByText('Locked total')).toBeInTheDocument();
  });

  it('keeps the user on seat selection for premium-required conflicts without showing the generic toast', async () => {
    const user = userEvent.setup();
    const selectedFlight = makeFlight({ id: 1, flightNumber: 'VN654' });
    const messageErrorSpy = vi.spyOn(message, 'error').mockImplementation(() => undefined as any);
    const submittedPayloads: unknown[] = [];

    const requestCounts = mockCreateBookingDependencies({
      flights: [selectedFlight],
      selectedFlight,
      seats: [
        makeSeat({
          id: 14,
          flightId: 1,
          seatNumber: '1A',
          seatClass: SeatClass.BUSINESS,
          price: 2625000
        })
      ]
    });

    server.use(
      http.post('/api/v1/booking/create', async ({ request }) => {
        submittedPayloads.push(await request.json());
        return HttpResponse.json(
          {
            type: 'ConflictException',
            title: 'Economy seats are sold out. Please select a premium seat to continue.',
            status: 409,
            code: 'PREMIUM_SEAT_SELECTION_REQUIRED'
          },
          { status: 409 }
        );
      })
    );

    renderWithRoute(<CreateBookingPage />, {
      route: '/bookings/create',
      path: '/bookings/create'
    });

    await user.click(await screen.findByRole('button', { name: 'Select flight' }));
    await user.click(await screen.findByRole('button', { name: 'Continue to review' }));
    const submitButton = await screen.findByRole('button', { name: 'Continue to wallet payment' });
    await waitFor(() => expect(submitButton).toBeEnabled());
    await user.click(submitButton);
    await waitFor(() => {
      expect(submittedPayloads).toEqual([
        {
          flightId: 1,
          description: 'N/A'
        }
      ]);
    });

    await waitFor(() => {
      expect(document.body).toHaveTextContent('You can skip seat selection and auto-assign Economy');
      expect(document.body).toHaveTextContent('Economy seats are sold out. Please select a premium seat to continue.');
      expect(document.body).toHaveTextContent(
        'Please choose a Business or First Class seat to continue and lock the final fare.'
      );
    });
    expect(messageErrorSpy).not.toHaveBeenCalled();
    expect(requestCounts.walletMe).toBe(0);
  }, 10000);

  it('shows the selected premium fare before checkout and keeps the locked premium total in payment', async () => {
    const user = userEvent.setup();
    const selectedFlight = makeFlight({ id: 1, flightNumber: 'VN556', price: 1500000 });
    const selectedSeat = makeSeat({
      id: 15,
      flightId: 1,
      seatNumber: '1A',
      seatClass: SeatClass.BUSINESS,
      price: 2625000
    });
    const checkout = makeBookingCheckout(
      {},
      {
        id: 78,
        flightId: 1,
        flightNumber: 'VN556',
        seatNumber: '1A',
        seatClass: SeatClass.BUSINESS,
        price: 2625000,
        paymentId: 702
      },
      {
        id: 702,
        bookingId: 78,
        amount: 2625000,
        paymentStatus: PaymentStatus.PENDING
      }
    );
    const submittedPayloads: unknown[] = [];

    const requestCounts = mockCreateBookingDependencies({
      flights: [selectedFlight],
      selectedFlight,
      seats: [selectedSeat]
    });

    server.use(
      http.post('/api/v1/booking/create', async ({ request }) => {
        submittedPayloads.push(await request.json());
        return HttpResponse.json(checkout);
      }),
      http.get('/api/v1/payment/get-by-id', () => HttpResponse.json(checkout.payment))
    );

    renderWithRoute(<CreateBookingPage />, {
      route: '/bookings/create',
      path: '/bookings/create'
    });

    await user.click(await screen.findByRole('button', { name: 'Select flight' }));
    await user.click(await screen.findByRole('button', { name: '1A' }));
    await user.click(screen.getByRole('button', { name: 'Continue to review' }));

    expect(requestCounts.walletMe).toBe(0);
    expect((await screen.findAllByText('Selected fare')).length).toBeGreaterThan(0);
    expect(screen.getByText('Checkout will lock the exact fare for seat 1A.')).toBeInTheDocument();
    expect(screen.getAllByText(toCurrencyRegex(selectedSeat.price, selectedSeat.currency)).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Continue to wallet payment' }));

    await waitFor(() => {
      expect(submittedPayloads).toEqual([
        {
          flightId: 1,
          description: 'N/A',
          seatNumber: '1A'
        }
      ]);
    });

    expect(await screen.findByText('Locked total')).toBeInTheDocument();
    expect(screen.getAllByText(toCurrencyRegex(checkout.payment.amount, checkout.payment.currency)).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(requestCounts.walletMe).toBeGreaterThan(0);
    });
  }, 10000);

  it('shows the sold-out warning and keeps review blocked when no seats are available', async () => {
    const user = userEvent.setup();
    const selectedFlight = makeFlight({ id: 1, flightNumber: 'VN000' });

    mockCreateBookingDependencies({
      flights: [selectedFlight],
      selectedFlight,
      seats: []
    });

    renderWithRoute(<CreateBookingPage />, {
      route: '/bookings/create',
      path: '/bookings/create'
    });

    await user.click(await screen.findByRole('button', { name: 'Select flight' }));

    expect(await screen.findByText('No seats are available for this flight.')).toBeInTheDocument();
    expect(screen.getByText('You can skip seat selection and auto-assign Economy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to review' })).toBeDisabled();
  });

  it('redirects to existing confirmed booking when create returns ACTIVE_BOOKING_EXISTS', async () => {
    const user = userEvent.setup();
    const selectedFlight = makeFlight({ id: 1, flightNumber: 'VN680' });
    let createAttempts = 0;
    let walletPayAttempts = 0;

    mockCreateBookingDependencies({
      flights: [selectedFlight],
      selectedFlight,
      seats: [makeSeat({ id: 12, flightId: 1, seatNumber: '1A' })]
    });

    server.use(
      http.post('/api/v1/booking/create', () => {
        createAttempts += 1;
        return HttpResponse.json(
          {
            type: 'ConflictException',
            title: 'An active booking already exists for this flight',
            status: 409,
            code: 'ACTIVE_BOOKING_EXISTS',
            existingBookingId: 62,
            existingBookingStatus: BookingStatus.CONFIRMED,
            existingPaymentStatus: PaymentStatus.SUCCEEDED
          },
          { status: 409 }
        );
      }),
      http.post('/api/v1/wallet/pay-booking', () => {
        walletPayAttempts += 1;
        return HttpResponse.json({});
      })
    );

    renderCreateBookingWithLocationProbe('/bookings/create');

    await user.click(await screen.findByRole('button', { name: 'Select flight' }));
    await user.click(await screen.findByRole('button', { name: '1A' }));
    await user.click(screen.getByRole('button', { name: 'Continue to review' }));
    await user.click(await screen.findByRole('button', { name: 'Continue to wallet payment' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/bookings/62');
    }, { timeout: 10000 });

    expect(createAttempts).toBe(1);
    expect(walletPayAttempts).toBe(0);
  }, CI_FLAKY_TEST_TIMEOUT_MS);

  it('resumes existing pending payment flow when create returns ACTIVE_BOOKING_EXISTS', async () => {
    const user = userEvent.setup();
    const selectedFlight = makeFlight({ id: 1, flightNumber: 'VN681' });
    const pendingBooking = makeBooking({
      id: 63,
      flightId: 1,
      flightNumber: 'VN681',
      bookingStatus: BookingStatus.PENDING_PAYMENT,
      paymentId: 603,
      paymentSummary: null
    });
    const pendingPayment = makePayment({
      id: 603,
      bookingId: 63,
      paymentStatus: PaymentStatus.PENDING,
      completedAt: null
    });
    let createAttempts = 0;
    let walletPayAttempts = 0;
    let bookingByIdCalls = 0;

    mockCreateBookingDependencies({
      flights: [selectedFlight],
      selectedFlight,
      seats: [makeSeat({ id: 13, flightId: 1, seatNumber: '1A' })]
    });

    server.use(
      http.post('/api/v1/booking/create', () => {
        createAttempts += 1;
        return HttpResponse.json(
          {
            type: 'ConflictException',
            title: 'An active booking already exists for this flight',
            status: 409,
            code: 'ACTIVE_BOOKING_EXISTS',
            existingBookingId: 63,
            existingBookingStatus: BookingStatus.PENDING_PAYMENT,
            existingPaymentStatus: PaymentStatus.PENDING
          },
          { status: 409 }
        );
      }),
      http.get('/api/v1/booking/get-by-id', () => {
        bookingByIdCalls += 1;
        return HttpResponse.json(pendingBooking);
      }),
      http.get('/api/v1/payment/get-by-id', () => HttpResponse.json(pendingPayment)),
      http.post('/api/v1/wallet/pay-booking', () => {
        walletPayAttempts += 1;
        return HttpResponse.json({});
      })
    );

    renderCreateBookingWithLocationProbe('/bookings/create');

    await user.click(await screen.findByRole('button', { name: 'Select flight' }));
    await user.click(await screen.findByRole('button', { name: '1A' }));
    await user.click(screen.getByRole('button', { name: 'Continue to review' }));
    await user.click(await screen.findByRole('button', { name: 'Continue to wallet payment' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/bookings/create?bookingId=63');
      expect(screen.getByText('Loading payment for booking #63')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Pay with wallet' })).toBeInTheDocument();
    }, { timeout: 10000 });

    expect(createAttempts).toBe(1);
    expect(bookingByIdCalls).toBeGreaterThan(0);
    expect(walletPayAttempts).toBe(0);
  }, CI_FLAKY_TEST_TIMEOUT_MS);

  it('hydrates payment step when opening with bookingId deep-link', async () => {
    const selectedFlight = makeFlight({ id: 1, flightNumber: 'VN678' });
    const pendingBooking = makeBooking({
      id: 55,
      flightId: 1,
      flightNumber: 'VN678',
      bookingStatus: BookingStatus.PENDING_PAYMENT,
      paymentId: 500,
      paymentSummary: null
    });
    const pendingPayment = makePayment({
      id: 500,
      bookingId: 55,
      paymentStatus: PaymentStatus.PENDING,
      completedAt: null,
      paymentCode: 'TBK-55',
      transferInstruction: {
        bankName: 'Vietcombank',
        accountName: 'TRAVEL BOOKING COMPANY',
        accountNumber: '1029384756',
        amount: 2625000,
        currency: 'VND',
        content: 'TBK-55',
        expiresAt: '2099-03-10T07:15:00.000Z'
      }
    });
    let paymentByIdCalls = 0;

    const requestCounts = mockCreateBookingDependencies({
      flights: [selectedFlight],
      selectedFlight,
      seats: [makeSeat({ id: 10, flightId: 1, seatNumber: '1A' })]
    });

    server.use(
      http.get('/api/v1/booking/get-by-id', () => HttpResponse.json(pendingBooking)),
      http.get('/api/v1/payment/get-by-id', () => {
        paymentByIdCalls += 1;
        return HttpResponse.json(pendingPayment);
      })
    );

    renderWithRoute(<CreateBookingPage />, {
      route: '/bookings/create?bookingId=55',
      path: '/bookings/create'
    });

    await waitFor(() => {
      expect(screen.getByText('Loading payment for booking #55')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Pay with wallet' })).toBeInTheDocument();
    }, { timeout: 10000 });

    expect(screen.queryByRole('heading', { name: 'Select a flight' })).not.toBeInTheDocument();
    expect((await screen.findAllByText('Selected fare')).length).toBeGreaterThan(0);
    expect(requestCounts.flightById).toBe(0);
    expect(requestCounts.seatInventory).toBe(0);
    expect(requestCounts.walletMe).toBeGreaterThan(0);
    expect(paymentByIdCalls).toBeGreaterThan(0);
  }, CI_FLAKY_TEST_TIMEOUT_MS);

  it('redirects payment deep-link to detail when booking is already confirmed', async () => {
    const selectedFlight = makeFlight({ id: 1, flightNumber: 'VN679' });
    const confirmedBooking = makeBooking({
      id: 56,
      flightId: 1,
      flightNumber: 'VN679',
      bookingStatus: BookingStatus.CONFIRMED,
      paymentId: 501
    });

    mockCreateBookingDependencies({
      flights: [selectedFlight],
      selectedFlight,
      seats: [makeSeat({ id: 11, flightId: 1, seatNumber: '1A' })]
    });

    server.use(http.get('/api/v1/booking/get-by-id', () => HttpResponse.json(confirmedBooking)));

    renderCreateBookingWithLocationProbe('/bookings/create?bookingId=56');

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/bookings/56');
    });

    expect(screen.queryByRole('button', { name: 'Pay with wallet' })).not.toBeInTheDocument();
  });

  it(
    'keeps booking submit disabled while passenger profile is syncing, then enables it after retry success',
    async () => {
      const user = userEvent.setup();
      const selectedFlight = makeFlight({ id: 1, flightNumber: 'VN999' });
      let passengerAttempts = 0;

      mockCreateBookingDependencies({
        flights: [selectedFlight],
        selectedFlight,
        seats: [makeSeat({ id: 12, flightId: 1, seatNumber: '1A' })]
      });

      server.use(
        http.get('/api/v1/passenger/get-by-user-id', () => {
          passengerAttempts += 1;

          if (passengerAttempts < 3) {
            return new HttpResponse(null, { status: 404 });
          }

          return HttpResponse.json(makePassenger());
        })
      );

      renderCreateBookingWithRetryClient();

      await user.click(await screen.findByRole('button', { name: 'Select flight' }));
      await user.click(await screen.findByRole('button', { name: '1A' }));
      await user.click(screen.getByRole('button', { name: 'Continue to review' }));

      expect(await screen.findByText('Syncing passenger profile')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continue to wallet payment' })).toBeDisabled();

      await waitFor(() => {
        expect(passengerAttempts).toBe(3);
        expect(screen.getByText('Nguyen Van A · Passport B1234567')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Continue to wallet payment' })).toBeEnabled();
      }, { timeout: 5000 });
    },
    10000
  );

  it(
    'shows passenger not found only after retry is exhausted',
    async () => {
      const user = userEvent.setup();
      const selectedFlight = makeFlight({ id: 1, flightNumber: 'VN998' });
      let passengerAttempts = 0;

      mockCreateBookingDependencies({
        flights: [selectedFlight],
        selectedFlight,
        seats: [makeSeat({ id: 13, flightId: 1, seatNumber: '1A' })]
      });

      server.use(
        http.get('/api/v1/passenger/get-by-user-id', () => {
          passengerAttempts += 1;
          return new HttpResponse(null, { status: 404 });
        })
      );

      renderCreateBookingWithRetryClient();

      await user.click(await screen.findByRole('button', { name: 'Select flight' }));
      await user.click(await screen.findByRole('button', { name: '1A' }));
      await user.click(screen.getByRole('button', { name: 'Continue to review' }));

      expect(await screen.findByText('Syncing passenger profile')).toBeInTheDocument();

      await waitFor(() => {
        expect(passengerAttempts).toBe(6);
        expect(screen.getByText('No passenger profile was found for the current user')).toBeInTheDocument();
      }, { timeout: 8000 });

      expect(screen.getByRole('button', { name: 'Continue to wallet payment' })).toBeDisabled();
    },
    15000
  );
});
