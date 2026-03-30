import { PaymentSucceededConsumerHandler } from '@/booking/consumers/payment-succeeded.consumer';
import { Booking } from '@/booking/entities/booking.entity';
import { OutboxMessage } from '@/booking/entities/outbox-message.entity';
import { ProcessedMessage } from '@/booking/entities/processed-message.entity';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { SeatClass } from '@/booking/enums/seat-class.enum';
import { PaymentSucceeded } from 'building-blocks/contracts/payment.contract';

const buildBooking = (partial: Partial<Booking> = {}) =>
  new Booking({
    id: 99,
    paymentId: 901,
    bookingStatus: BookingStatus.PENDING_PAYMENT,
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
    ...partial
  });

describe('PaymentSucceededConsumerHandler', () => {
  it('confirms hold-based bookings and enqueues a seat commit in the same transaction', async () => {
    const processedMessageRepository = {
      hasProcessedMessage: jest.fn().mockResolvedValue(false)
    };
    const processedMessageTxRepository = {
      findOneBy: jest.fn().mockResolvedValue(null),
      insert: jest.fn()
    };
    const bookingRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(buildBooking())
      }),
      save: jest.fn().mockImplementation(async (booking) => booking)
    };
    const outboxRepository = {
      insert: jest.fn()
    };
    const manager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === ProcessedMessage) {
          return processedMessageTxRepository;
        }

        if (entity === Booking) {
          return bookingRepository;
        }

        if (entity === OutboxMessage) {
          return outboxRepository;
        }

        throw new Error(`Unexpected repository: ${entity?.name}`);
      })
    };
    const dataSource = {
      transaction: jest.fn().mockImplementation(async (callback) => callback(manager))
    };
    const bookingSeatWorkflowService = {
      enqueueRefund: jest.fn(),
      enqueueSeatCommit: jest.fn()
    };

    const handler = new PaymentSucceededConsumerHandler(
      processedMessageRepository as any,
      dataSource as any,
      bookingSeatWorkflowService as any
    );

    await handler.handle(
      'payment.succeeded',
      new PaymentSucceeded({
        paymentId: 901,
        bookingId: 99,
        userId: 42,
        amount: 1500000,
        currency: 'VND',
        occurredAt: new Date('2099-03-10T07:10:00.000Z')
      }),
      {
        messageId: 'payment-msg-1'
      } as any
    );

    expect(bookingRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingStatus: BookingStatus.CONFIRMED,
        seatCommitRequestedAt: new Date('2099-03-10T07:10:00.000Z')
      })
    );
    expect(bookingSeatWorkflowService.enqueueSeatCommit).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        bookingStatus: BookingStatus.CONFIRMED,
        seatHoldToken: 'hold-1'
      }),
      new Date('2099-03-10T07:10:00.000Z')
    );
    expect(outboxRepository.insert).toHaveBeenCalledTimes(1);
    expect(processedMessageTxRepository.insert).toHaveBeenCalledTimes(1);
  });

  it('skips seat commit publishing for legacy already-booked inventory', async () => {
    const processedMessageRepository = {
      hasProcessedMessage: jest.fn().mockResolvedValue(false)
    };
    const processedMessageTxRepository = {
      findOneBy: jest.fn().mockResolvedValue(null),
      insert: jest.fn()
    };
    const bookingRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(
          buildBooking({
            seatHoldToken: null
          })
        )
      }),
      save: jest.fn().mockImplementation(async (booking) => booking)
    };
    const outboxRepository = {
      insert: jest.fn()
    };
    const manager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === ProcessedMessage) {
          return processedMessageTxRepository;
        }

        if (entity === Booking) {
          return bookingRepository;
        }

        if (entity === OutboxMessage) {
          return outboxRepository;
        }

        throw new Error(`Unexpected repository: ${entity?.name}`);
      })
    };
    const dataSource = {
      transaction: jest.fn().mockImplementation(async (callback) => callback(manager))
    };
    const bookingSeatWorkflowService = {
      enqueueRefund: jest.fn(),
      enqueueSeatCommit: jest.fn()
    };

    const handler = new PaymentSucceededConsumerHandler(
      processedMessageRepository as any,
      dataSource as any,
      bookingSeatWorkflowService as any
    );

    await handler.handle(
      'payment.succeeded',
      new PaymentSucceeded({
        paymentId: 901,
        bookingId: 99,
        userId: 42,
        amount: 1500000,
        currency: 'VND',
        occurredAt: new Date('2099-03-10T07:10:00.000Z')
      }),
      {
        messageId: 'payment-msg-2'
      } as any
    );

    expect(bookingRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingStatus: BookingStatus.CONFIRMED,
        seatCommitRequestedAt: undefined
      })
    );
    expect(bookingSeatWorkflowService.enqueueSeatCommit).not.toHaveBeenCalled();
    expect(outboxRepository.insert).toHaveBeenCalledTimes(1);
  });
});
