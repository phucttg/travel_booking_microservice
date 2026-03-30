import { BookingPendingSeatSweeperService } from '@/booking/services/booking-pending-seat-sweeper.service';
import { Booking } from '@/booking/entities/booking.entity';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { SeatClass } from '@/booking/enums/seat-class.enum';
import { SeatReleaseReason } from 'building-blocks/contracts/flight.contract';

const buildPendingBooking = (partial: Partial<Booking> = {}) =>
  new Booking({
    id: 99,
    bookingStatus: BookingStatus.PENDING_PAYMENT,
    seatHoldToken: 'hold-1',
    seatHoldExpiresAt: new Date('2099-03-10T07:15:00.000Z'),
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
    ...partial
  });

describe('BookingPendingSeatSweeperService', () => {
  it('expires pending bookings whose seat holds are overdue', async () => {
    const expiredBookings = [buildPendingBooking(), buildPendingBooking({ id: 100, seatNumber: '3B' })];
    const bookingQuery = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(expiredBookings)
    };
    const manager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === Booking) {
          return {
            createQueryBuilder: jest.fn().mockReturnValue(bookingQuery)
          };
        }

        throw new Error(`Unexpected repository: ${entity?.name}`);
      })
    };
    const dataSource = {
      transaction: jest.fn().mockImplementation(async (callback) => callback(manager))
    };
    const bookingSeatWorkflowService = {
      expirePendingBooking: jest.fn().mockImplementation(async (_manager, booking) => booking)
    };

    const service = new BookingPendingSeatSweeperService(
      dataSource as any,
      bookingSeatWorkflowService as any
    );

    await (service as any).expirePendingSeatHolds();

    expect(bookingSeatWorkflowService.expirePendingBooking).toHaveBeenNthCalledWith(
      1,
      manager,
      expiredBookings[0],
      SeatReleaseReason.BOOKING_EXPIRED,
      expect.any(Date)
    );
    expect(bookingSeatWorkflowService.expirePendingBooking).toHaveBeenNthCalledWith(
      2,
      manager,
      expiredBookings[1],
      SeatReleaseReason.BOOKING_EXPIRED,
      expect.any(Date)
    );
  });
});
