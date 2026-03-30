import { ConflictException, NotFoundException } from '@nestjs/common';
import { AxiosError } from 'axios';
import { CreateBooking, CreateBookingHandler } from '@/booking/features/v1/create-booking/create-booking';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { SeatClass } from '@/booking/enums/seat-class.enum';
import {
  FlightStatus,
  PREMIUM_SEAT_SELECTION_REQUIRED_CODE,
  PREMIUM_SEAT_SELECTION_REQUIRED_MESSAGE
} from 'building-blocks/contracts/flight.contract';

const buildUpstreamFlightError = (status: number, data: Record<string, unknown>) =>
  new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data
  } as any);

const createWorkflowService = () => ({
  expirePendingBooking: jest.fn(),
  cancelBooking: jest.fn(),
  enqueuePendingSeatRelease: jest.fn(),
  enqueueConfirmedSeatRelease: jest.fn(),
  enqueueSeatCommit: jest.fn(),
  enqueueRefund: jest.fn()
});

describe('CreateBookingHandler', () => {
  it('creates a pending checkout with the locked seat price instead of the base flight fare', async () => {
    const baseNow = new Date('2099-03-10T07:00:00.000Z');
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(baseNow.getTime());
    const bookingRepository = {
      findActiveBookingByUserAndFlight: jest.fn().mockResolvedValue(null),
      createBooking: jest.fn().mockImplementation(async (booking) => ({ ...booking, id: 99 })),
      updateBooking: jest.fn().mockImplementation(async (booking) => booking)
    };
    const flightClient = {
      getFlightById: jest.fn().mockResolvedValue({
        id: 7,
        flightNumber: 'VN777',
        price: 1500000,
        flightStatus: FlightStatus.SCHEDULED,
        flightDate: '2099-03-10T00:00:00.000Z',
        departureDate: '2099-03-10T08:00:00.000Z',
        aircraftId: 3,
        departureAirportId: 1,
        arriveAirportId: 2
      }),
      reserveSeat: jest.fn().mockResolvedValue({
        id: 55,
        seatNumber: '1A',
        seatClass: SeatClass.BUSINESS,
        seatType: 1,
        flightId: 7,
        price: 2625000,
        currency: 'VND',
        isReserved: true,
        seatState: 1,
        holdToken: 'hold-token-1',
        holdExpiresAt: '2099-03-10T07:17:00.000Z',
        createdAt: new Date().toISOString()
      })
    };
    const passengerClient = {
      getPassengerByUserId: jest.fn().mockResolvedValue({
        id: 11,
        name: 'Nguyen Van A'
      })
    };
    const paymentClient = {
      createPaymentIntent: jest.fn().mockResolvedValue({
        id: 901,
        bookingId: 99,
        userId: 42,
        amount: 2625000,
        currency: 'VND',
        paymentStatus: 0,
        refundStatus: 0,
        expiresAt: '2099-03-10T07:15:00.000Z',
        createdAt: new Date().toISOString()
      }),
      getPaymentById: jest.fn()
    };
    const idempotencyRepository = {
      findByScopeAndKey: jest.fn().mockResolvedValue(null),
      saveRecord: jest.fn()
    };
    const rabbitmqPublisher = {
      publishMessage: jest.fn(),
      isPublished: jest.fn()
    };
    const dataSource = {
      transaction: jest.fn()
    };
    const bookingSeatWorkflowService = createWorkflowService();

    const handler = new CreateBookingHandler(
      bookingRepository as any,
      flightClient as any,
      passengerClient as any,
      paymentClient as any,
      idempotencyRepository as any,
      dataSource as any,
      rabbitmqPublisher as any,
      bookingSeatWorkflowService as any
    );

    try {
      const result = await handler.execute(
        new CreateBooking({
          currentUserId: 42,
          flightId: 7,
          description: 'Window seat',
          seatNumber: '1A',
          idempotencyKey: 'booking-1'
        })
      );

      expect(flightClient.reserveSeat).toHaveBeenCalledWith(
        expect.objectContaining({
          flightId: 7,
          seatNumber: '1A',
          holdUntil: new Date('2099-03-10T07:17:00.000Z')
        })
      );
      expect(bookingRepository.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 2625000,
          seatClass: SeatClass.BUSINESS,
          bookingStatus: BookingStatus.PENDING_PAYMENT,
          paymentExpiresAt: new Date('2099-03-10T07:15:00.000Z'),
          seatHoldToken: 'hold-token-1',
          seatHoldExpiresAt: new Date('2099-03-10T07:17:00.000Z')
        })
      );
      expect(paymentClient.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 2625000,
          currency: 'VND',
          expiresAt: new Date('2099-03-10T07:15:00.000Z')
        })
      );
      expect(result.booking.bookingStatus).toBe(BookingStatus.PENDING_PAYMENT);
      expect(result.payment.amount).toBe(2625000);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('rejects duplicate active bookings before reserving a new seat', async () => {
    const bookingRepository = {
      findActiveBookingByUserAndFlight: jest.fn().mockResolvedValue({
        id: 88,
        paymentId: 45,
        bookingStatus: BookingStatus.PENDING_PAYMENT
      })
    };
    const flightClient = {
      getFlightById: jest.fn().mockResolvedValue({
        id: 7,
        flightNumber: 'VN777',
        price: 1500000,
        flightStatus: FlightStatus.SCHEDULED,
        flightDate: '2099-03-10T00:00:00.000Z',
        departureDate: '2099-03-10T08:00:00.000Z'
      }),
      reserveSeat: jest.fn()
    };
    const passengerClient = {
      getPassengerByUserId: jest.fn().mockResolvedValue({
        id: 11,
        name: 'Nguyen Van A'
      })
    };
    const paymentClient = {
      createPaymentIntent: jest.fn(),
      getPaymentById: jest.fn().mockResolvedValue({
        id: 45,
        paymentStatus: 0
      })
    };
    const idempotencyRepository = {
      findByScopeAndKey: jest.fn().mockResolvedValue(null),
      saveRecord: jest.fn()
    };
    const rabbitmqPublisher = {
      publishMessage: jest.fn(),
      isPublished: jest.fn()
    };
    const dataSource = {
      transaction: jest.fn()
    };
    const bookingSeatWorkflowService = createWorkflowService();

    const handler = new CreateBookingHandler(
      bookingRepository as any,
      flightClient as any,
      passengerClient as any,
      paymentClient as any,
      idempotencyRepository as any,
      dataSource as any,
      rabbitmqPublisher as any,
      bookingSeatWorkflowService as any
    );

    await expect(
      handler.execute(
        new CreateBooking({
          currentUserId: 42,
          flightId: 7,
          description: 'Window seat',
          seatNumber: '1A',
          idempotencyKey: 'booking-dup'
        })
      )
    ).rejects.toBeInstanceOf(ConflictException);

    expect(flightClient.reserveSeat).not.toHaveBeenCalled();
    expect(paymentClient.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('maps upstream premium-required conflicts into a local ConflictException', async () => {
    const bookingRepository = {
      findActiveBookingByUserAndFlight: jest.fn().mockResolvedValue(null),
      createBooking: jest.fn(),
      updateBooking: jest.fn()
    };
    const flightClient = {
      getFlightById: jest.fn().mockResolvedValue({
        id: 7,
        flightNumber: 'VN777',
        price: 1500000,
        flightStatus: FlightStatus.SCHEDULED,
        flightDate: '2099-03-10T00:00:00.000Z',
        departureDate: '2099-03-10T08:00:00.000Z'
      }),
      reserveSeat: jest.fn().mockRejectedValue(
        buildUpstreamFlightError(409, {
          title: PREMIUM_SEAT_SELECTION_REQUIRED_MESSAGE,
          code: PREMIUM_SEAT_SELECTION_REQUIRED_CODE
        })
      )
    };
    const passengerClient = {
      getPassengerByUserId: jest.fn().mockResolvedValue({
        id: 11,
        name: 'Nguyen Van A'
      })
    };
    const paymentClient = {
      createPaymentIntent: jest.fn(),
      getPaymentById: jest.fn()
    };
    const idempotencyRepository = {
      findByScopeAndKey: jest.fn().mockResolvedValue(null),
      saveRecord: jest.fn()
    };
    const rabbitmqPublisher = {
      publishMessage: jest.fn(),
      isPublished: jest.fn()
    };
    const dataSource = {
      transaction: jest.fn()
    };
    const bookingSeatWorkflowService = createWorkflowService();

    const handler = new CreateBookingHandler(
      bookingRepository as any,
      flightClient as any,
      passengerClient as any,
      paymentClient as any,
      idempotencyRepository as any,
      dataSource as any,
      rabbitmqPublisher as any,
      bookingSeatWorkflowService as any
    );

    try {
      await handler.execute(
        new CreateBooking({
          currentUserId: 42,
          flightId: 7,
          description: 'Auto assign',
          idempotencyKey: 'booking-premium-required'
        })
      );
      fail('Expected premium-required conflict');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toEqual({
        message: PREMIUM_SEAT_SELECTION_REQUIRED_MESSAGE,
        code: PREMIUM_SEAT_SELECTION_REQUIRED_CODE
      });
    }

    expect(bookingRepository.createBooking).not.toHaveBeenCalled();
    expect(paymentClient.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('maps upstream sold-out 404 errors into a local NotFoundException', async () => {
    const bookingRepository = {
      findActiveBookingByUserAndFlight: jest.fn().mockResolvedValue(null),
      createBooking: jest.fn(),
      updateBooking: jest.fn()
    };
    const flightClient = {
      getFlightById: jest.fn().mockResolvedValue({
        id: 7,
        flightNumber: 'VN777',
        price: 1500000,
        flightStatus: FlightStatus.SCHEDULED,
        flightDate: '2099-03-10T00:00:00.000Z',
        departureDate: '2099-03-10T08:00:00.000Z'
      }),
      reserveSeat: jest.fn().mockRejectedValue(
        buildUpstreamFlightError(404, {
          title: 'No seat available!'
        })
      )
    };
    const passengerClient = {
      getPassengerByUserId: jest.fn().mockResolvedValue({
        id: 11,
        name: 'Nguyen Van A'
      })
    };
    const paymentClient = {
      createPaymentIntent: jest.fn(),
      getPaymentById: jest.fn()
    };
    const idempotencyRepository = {
      findByScopeAndKey: jest.fn().mockResolvedValue(null),
      saveRecord: jest.fn()
    };
    const rabbitmqPublisher = {
      publishMessage: jest.fn(),
      isPublished: jest.fn()
    };
    const dataSource = {
      transaction: jest.fn()
    };
    const bookingSeatWorkflowService = createWorkflowService();

    const handler = new CreateBookingHandler(
      bookingRepository as any,
      flightClient as any,
      passengerClient as any,
      paymentClient as any,
      idempotencyRepository as any,
      dataSource as any,
      rabbitmqPublisher as any,
      bookingSeatWorkflowService as any
    );

    try {
      await handler.execute(
        new CreateBooking({
          currentUserId: 42,
          flightId: 7,
          description: 'Auto assign',
          idempotencyKey: 'booking-sold-out'
        })
      );
      fail('Expected sold-out not found');
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).message).toBe('No seat available!');
    }

    expect(bookingRepository.createBooking).not.toHaveBeenCalled();
    expect(paymentClient.createPaymentIntent).not.toHaveBeenCalled();
  });
});
