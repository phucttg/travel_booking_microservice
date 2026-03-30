import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { prepareOutboxMessage } from 'building-blocks/rabbitmq/outbox-message';
import {
  SeatCommitRequested,
  SeatReleaseReason,
  SeatReleaseRequested
} from 'building-blocks/contracts/flight.contract';
import { PaymentRefundRequested } from 'building-blocks/contracts/payment.contract';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { Booking } from '@/booking/entities/booking.entity';
import { OutboxMessage } from '@/booking/entities/outbox-message.entity';

@Injectable()
export class BookingSeatWorkflowService {
  async expirePendingBooking(
    manager: EntityManager,
    booking: Booking,
    reason: SeatReleaseReason,
    occurredAt = new Date()
  ): Promise<Booking> {
    if (booking.bookingStatus !== BookingStatus.PENDING_PAYMENT) {
      return booking;
    }

    const expiredBooking = await manager.getRepository(Booking).save(
      new Booking({
        ...booking,
        bookingStatus: BookingStatus.EXPIRED,
        expiredAt: occurredAt,
        updatedAt: occurredAt
      })
    );

    await this.enqueuePendingSeatRelease(manager, expiredBooking, reason, occurredAt);

    return expiredBooking;
  }

  async cancelBooking(
    manager: EntityManager,
    booking: Booking,
    occurredAt = new Date()
  ): Promise<Booking> {
    const canceledBooking = await manager.getRepository(Booking).save(
      new Booking({
        ...booking,
        bookingStatus: BookingStatus.CANCELED,
        canceledAt: occurredAt,
        updatedAt: occurredAt
      })
    );

    return canceledBooking;
  }

  async enqueuePendingSeatRelease(
    manager: EntityManager,
    booking: Booking,
    reason: SeatReleaseReason,
    occurredAt = new Date()
  ): Promise<void> {
    const message = new SeatReleaseRequested({
      flightId: booking.flightId,
      seatNumber: booking.seatNumber,
      reason,
      requestedAt: occurredAt,
      holdToken: booking.seatHoldToken || undefined
    });

    await manager.getRepository(OutboxMessage).insert(
      prepareOutboxMessage(message, {
        occurredAt
      })
    );
  }

  async enqueueConfirmedSeatRelease(
    manager: EntityManager,
    booking: Booking,
    reason: SeatReleaseReason,
    occurredAt = new Date()
  ): Promise<void> {
    const includeHoldToken = Boolean(booking.seatHoldToken) && !booking.seatCommittedAt;

    await manager.getRepository(OutboxMessage).insert(
      prepareOutboxMessage(
        new SeatReleaseRequested({
          bookingId: booking.id,
          flightId: booking.flightId,
          seatNumber: booking.seatNumber,
          reason,
          requestedAt: occurredAt,
          holdToken: includeHoldToken ? booking.seatHoldToken : undefined
        }),
        {
          occurredAt
        }
      )
    );
  }

  async enqueueSeatCommit(manager: EntityManager, booking: Booking, occurredAt = new Date()): Promise<void> {
    if (!booking.seatHoldToken) {
      return;
    }

    await manager.getRepository(OutboxMessage).insert(
      prepareOutboxMessage(
        new SeatCommitRequested({
          flightId: booking.flightId,
          seatNumber: booking.seatNumber,
          holdToken: booking.seatHoldToken,
          bookingId: booking.id,
          committedAt: occurredAt
        }),
        {
          occurredAt
        }
      )
    );
  }

  async enqueueRefund(
    manager: EntityManager,
    booking: Booking,
    reason: string,
    occurredAt = new Date()
  ): Promise<void> {
    if (!booking.paymentId) {
      return;
    }

    await manager.getRepository(OutboxMessage).insert(
      prepareOutboxMessage(
        new PaymentRefundRequested({
          paymentId: booking.paymentId,
          bookingId: booking.id,
          userId: booking.userId,
          amount: booking.price,
          currency: booking.currency,
          reason,
          requestedAt: occurredAt
        }),
        {
          occurredAt
        }
      )
    );
  }
}
