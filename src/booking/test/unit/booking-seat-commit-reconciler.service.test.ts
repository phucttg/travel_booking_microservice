import { BookingSeatCommitReconcilerService } from '@/booking/services/booking-seat-commit-reconciler.service';
import { Booking } from '@/booking/entities/booking.entity';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { SeatClass } from '@/booking/enums/seat-class.enum';
import { SeatState } from 'building-blocks/contracts/flight.contract';

const buildBooking = (partial: Partial<Booking> = {}) =>
  new Booking({
    id: 99,
    bookingStatus: BookingStatus.CONFIRMED,
    seatHoldToken: 'hold-1',
    flightId: 7,
    seatNumber: '3A',
    seatClass: SeatClass.ECONOMY,
    flightNumber: 'VN777',
    aircraftId: 3,
    departureAirportId: 1,
    arriveAirportId: 2,
    flightDate: new Date('2099-03-10T08:00:00.000Z'),
    price: 1500000,
    currency: 'VND',
    description: 'Window seat',
    passengerName: 'Nguyen Van A',
    userId: 42,
    createdAt: new Date('2099-03-10T07:00:00.000Z'),
    confirmedAt: new Date('2099-03-10T07:10:00.000Z'),
    ...partial
  });

describe('BookingSeatCommitReconcilerService', () => {
  it('marks confirmed bookings as seat-committed once flight reports BOOKED ownership', async () => {
    const bookingRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(buildBooking())
      }),
      save: jest.fn().mockImplementation(async (booking) => booking)
    };
    const manager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === Booking) {
          return bookingRepository;
        }

        throw new Error(`Unexpected repository: ${entity?.name}`);
      })
    };
    const dataSource = {
      transaction: jest.fn().mockImplementation(async (callback) => callback(manager))
    };
    const flightClient = {
      getSeatState: jest.fn().mockResolvedValue({
        seatState: SeatState.BOOKED,
        reservedBookingId: 99,
        holdExpiresAt: null
      })
    };
    const bookingSeatWorkflowService = {
      enqueueSeatCommit: jest.fn(),
      cancelBooking: jest.fn(),
      enqueueRefund: jest.fn()
    };

    const service = new BookingSeatCommitReconcilerService(
      dataSource as any,
      flightClient as any,
      bookingSeatWorkflowService as any
    );

    await (service as any).reconcileBookingSeatCommit(99);

    expect(bookingRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 99,
        seatCommittedAt: expect.any(Date)
      })
    );
    expect(bookingSeatWorkflowService.enqueueSeatCommit).not.toHaveBeenCalled();
    expect(bookingSeatWorkflowService.cancelBooking).not.toHaveBeenCalled();
  });

  it('re-enqueues seat commit while the hold is still active', async () => {
    const bookingRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(buildBooking())
      }),
      save: jest.fn().mockImplementation(async (booking) => booking)
    };
    const manager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === Booking) {
          return bookingRepository;
        }

        throw new Error(`Unexpected repository: ${entity?.name}`);
      })
    };
    const dataSource = {
      transaction: jest.fn().mockImplementation(async (callback) => callback(manager))
    };
    const flightClient = {
      getSeatState: jest.fn().mockResolvedValue({
        seatState: SeatState.HELD,
        reservedBookingId: null,
        holdExpiresAt: new Date('2099-03-10T07:30:00.000Z')
      })
    };
    const bookingSeatWorkflowService = {
      enqueueSeatCommit: jest.fn(),
      cancelBooking: jest.fn(),
      enqueueRefund: jest.fn()
    };

    const service = new BookingSeatCommitReconcilerService(
      dataSource as any,
      flightClient as any,
      bookingSeatWorkflowService as any
    );

    await (service as any).reconcileBookingSeatCommit(99);

    expect(bookingRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 99,
        seatCommitRequestedAt: expect.any(Date)
      })
    );
    expect(bookingSeatWorkflowService.enqueueSeatCommit).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        id: 99,
        seatHoldToken: 'hold-1'
      }),
      expect.any(Date)
    );
    expect(bookingSeatWorkflowService.cancelBooking).not.toHaveBeenCalled();
  });

  it('cancels and refunds when the seat can no longer be committed', async () => {
    const booking = buildBooking();
    const bookingRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(booking)
      })
    };
    const manager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === Booking) {
          return bookingRepository;
        }

        throw new Error(`Unexpected repository: ${entity?.name}`);
      })
    };
    const dataSource = {
      transaction: jest.fn().mockImplementation(async (callback) => callback(manager))
    };
    const flightClient = {
      getSeatState: jest.fn().mockResolvedValue({
        seatState: SeatState.AVAILABLE,
        reservedBookingId: null,
        holdExpiresAt: null
      })
    };
    const canceledBooking = buildBooking({
      bookingStatus: BookingStatus.CANCELED,
      seatHoldToken: 'hold-1'
    });
    const bookingSeatWorkflowService = {
      enqueueSeatCommit: jest.fn(),
      cancelBooking: jest.fn().mockResolvedValue(canceledBooking),
      enqueueRefund: jest.fn()
    };

    const service = new BookingSeatCommitReconcilerService(
      dataSource as any,
      flightClient as any,
      bookingSeatWorkflowService as any
    );

    await (service as any).reconcileBookingSeatCommit(99);

    expect(bookingSeatWorkflowService.cancelBooking).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        id: 99
      }),
      expect.any(Date)
    );
    expect(bookingSeatWorkflowService.enqueueRefund).toHaveBeenCalledWith(
      manager,
      canceledBooking,
      'Seat commit failed after payment succeeded',
      expect.any(Date)
    );
  });
});
