import { SeatCommitRequestedConsumerHandler } from '@/seat/consumers/seat-commit-requested.consumer';
import { SeatReleaseRequestedConsumerHandler } from '@/seat/consumers/seat-release-requested.consumer';
import {
  SeatCommitRequested,
  SeatReleaseReason,
  SeatReleaseRequested
} from 'building-blocks/contracts/flight.contract';

describe('SeatCommitRequestedConsumerHandler', () => {
  it('commits a held seat for fresh messages only', async () => {
    const seatRepository = {
      commitSeat: jest.fn().mockResolvedValue({
        id: 11
      })
    };
    const processedMessageRepository = {
      registerProcessedMessage: jest.fn().mockResolvedValue(true)
    };

    const handler = new SeatCommitRequestedConsumerHandler(
      seatRepository as any,
      processedMessageRepository as any
    );

    await handler.handle(
      'flight.seat.commit',
      new SeatCommitRequested({
        flightId: 7,
        seatNumber: '3A',
        holdToken: 'hold-1',
        bookingId: 99,
        committedAt: new Date('2099-03-10T07:12:00.000Z')
      }),
      {
        messageId: 'msg-1'
      } as any
    );

    expect(processedMessageRepository.registerProcessedMessage).toHaveBeenCalledWith(
      SeatCommitRequestedConsumerHandler.name,
      'msg-1'
    );
    expect(seatRepository.commitSeat).toHaveBeenCalledWith(7, '3A', 'hold-1', 99);
  });

  it('skips duplicate commit messages safely', async () => {
    const seatRepository = {
      commitSeat: jest.fn()
    };
    const processedMessageRepository = {
      registerProcessedMessage: jest.fn().mockResolvedValue(false)
    };

    const handler = new SeatCommitRequestedConsumerHandler(
      seatRepository as any,
      processedMessageRepository as any
    );

    await handler.handle(
      'flight.seat.commit',
      new SeatCommitRequested({
        flightId: 7,
        seatNumber: '3A',
        holdToken: 'hold-1',
        bookingId: 99,
        committedAt: new Date('2099-03-10T07:12:00.000Z')
      }),
      {
        messageId: 'msg-1'
      } as any
    );

    expect(seatRepository.commitSeat).not.toHaveBeenCalled();
  });
});

describe('SeatReleaseRequestedConsumerHandler', () => {
  it('releases held seats by hold token first and falls back to booking id when needed', async () => {
    const seatRepository = {
      releaseSeatByHoldToken: jest.fn().mockResolvedValue(null),
      releaseSeatByBookingId: jest.fn().mockResolvedValue({
        id: 11
      }),
      releaseLegacySeat: jest.fn()
    };
    const processedMessageRepository = {
      registerProcessedMessage: jest.fn().mockResolvedValue(true)
    };

    const handler = new SeatReleaseRequestedConsumerHandler(
      seatRepository as any,
      processedMessageRepository as any
    );

    await handler.handle(
      'flight.seat.release',
      new SeatReleaseRequested({
        flightId: 7,
        seatNumber: '3A',
        holdToken: 'hold-1',
        bookingId: 99,
        reason: SeatReleaseReason.BOOKING_CANCELED,
        requestedAt: new Date('2099-03-10T07:20:00.000Z')
      }),
      {
        messageId: 'msg-2'
      } as any
    );

    expect(seatRepository.releaseSeatByHoldToken).toHaveBeenCalledWith(7, '3A', 'hold-1');
    expect(seatRepository.releaseSeatByBookingId).toHaveBeenCalledWith(7, '3A', 99);
    expect(seatRepository.releaseLegacySeat).not.toHaveBeenCalled();
  });

  it('keeps legacy fallback limited to legacy-shaped messages', async () => {
    const seatRepository = {
      releaseSeatByHoldToken: jest.fn(),
      releaseSeatByBookingId: jest.fn(),
      releaseLegacySeat: jest.fn().mockResolvedValue({
        id: 12
      })
    };
    const processedMessageRepository = {
      registerProcessedMessage: jest.fn().mockResolvedValue(true)
    };

    const handler = new SeatReleaseRequestedConsumerHandler(
      seatRepository as any,
      processedMessageRepository as any
    );

    await handler.handle(
      'flight.seat.release',
      new SeatReleaseRequested({
        flightId: 7,
        seatNumber: '3B',
        reason: SeatReleaseReason.BOOKING_EXPIRED,
        requestedAt: new Date('2099-03-10T07:30:00.000Z')
      }),
      {
        messageId: 'msg-3'
      } as any
    );

    expect(seatRepository.releaseSeatByHoldToken).not.toHaveBeenCalled();
    expect(seatRepository.releaseSeatByBookingId).not.toHaveBeenCalled();
    expect(seatRepository.releaseLegacySeat).toHaveBeenCalledWith(7, '3B');
  });
});
