import { BookingSeatWorkflowService } from '@/booking/services/booking-seat-workflow.service';
import { Booking } from '@/booking/entities/booking.entity';
import { OutboxMessage } from '@/booking/entities/outbox-message.entity';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { SeatClass } from '@/booking/enums/seat-class.enum';
import { SeatReleaseReason } from 'building-blocks/contracts/flight.contract';

const buildBooking = (partial: Partial<Booking> = {}) =>
  new Booking({
    id: 99,
    flightId: 7,
    seatNumber: '3A',
    seatClass: SeatClass.ECONOMY,
    bookingStatus: BookingStatus.PENDING_PAYMENT,
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
    paymentId: 901,
    seatHoldToken: 'hold-1',
    ...partial
  });

describe('BookingSeatWorkflowService', () => {
  it('publishes pending-seat releases with the hold token', async () => {
    const outboxRepository = {
      insert: jest.fn()
    };
    const manager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === OutboxMessage) {
          return outboxRepository;
        }

        throw new Error(`Unexpected repository: ${entity?.name}`);
      })
    };

    const service = new BookingSeatWorkflowService();
    await service.enqueuePendingSeatRelease(
      manager as any,
      buildBooking(),
      SeatReleaseReason.BOOKING_EXPIRED,
      new Date('2099-03-10T07:15:00.000Z')
    );

    const insertedMessage = outboxRepository.insert.mock.calls[0][0];
    const payload = JSON.parse(insertedMessage.payload);

    expect(payload.flightId).toBe(7);
    expect(payload.seatNumber).toBe('3A');
    expect(payload.holdToken).toBe('hold-1');
    expect(payload.bookingId).toBeUndefined();
  });

  it('publishes confirmed-seat releases with booking id and hold token only while commit is pending', async () => {
    const outboxRepository = {
      insert: jest.fn()
    };
    const manager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === OutboxMessage) {
          return outboxRepository;
        }

        throw new Error(`Unexpected repository: ${entity?.name}`);
      })
    };

    const service = new BookingSeatWorkflowService();
    await service.enqueueConfirmedSeatRelease(
      manager as any,
      buildBooking({
        bookingStatus: BookingStatus.CONFIRMED,
        seatCommittedAt: null
      }),
      SeatReleaseReason.BOOKING_CANCELED,
      new Date('2099-03-10T07:20:00.000Z')
    );

    const insertedMessage = outboxRepository.insert.mock.calls[0][0];
    const payload = JSON.parse(insertedMessage.payload);

    expect(payload.bookingId).toBe(99);
    expect(payload.holdToken).toBe('hold-1');
  });

  it('publishes seat commit requests with the hold token and booking id', async () => {
    const outboxRepository = {
      insert: jest.fn()
    };
    const manager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === OutboxMessage) {
          return outboxRepository;
        }

        throw new Error(`Unexpected repository: ${entity?.name}`);
      })
    };

    const service = new BookingSeatWorkflowService();
    await service.enqueueSeatCommit(manager as any, buildBooking({ bookingStatus: BookingStatus.CONFIRMED }));

    const insertedMessage = outboxRepository.insert.mock.calls[0][0];
    const payload = JSON.parse(insertedMessage.payload);

    expect(payload.bookingId).toBe(99);
    expect(payload.flightId).toBe(7);
    expect(payload.seatNumber).toBe('3A');
    expect(payload.holdToken).toBe('hold-1');
  });
});
