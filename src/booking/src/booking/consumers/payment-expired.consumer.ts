import { Inject, Injectable } from '@nestjs/common';
import { RabbitmqMessageEnvelope } from 'building-blocks/contracts/message-envelope.contract';
import { PaymentExpired } from 'building-blocks/contracts/payment.contract';
import { IBookingRepository } from '@/data/repositories/booking.repository';
import { IProcessedMessageRepository } from '@/booking/repositories/processed-message.repository';
import { Booking } from '@/booking/entities/booking.entity';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import { SeatReleaseReason, SeatReleaseRequested } from 'building-blocks/contracts/flight.contract';
import { BookingStatus } from '@/booking/enums/booking-status.enum';

@Injectable()
export class PaymentExpiredConsumerHandler {
  constructor(
    @Inject('IBookingRepository') private readonly bookingRepository: IBookingRepository,
    @Inject('IProcessedMessageRepository') private readonly processedMessageRepository: IProcessedMessageRepository,
    @Inject('IRabbitmqPublisher') private readonly rabbitmqPublisher: IRabbitmqPublisher
  ) {}

  async handle(
    _queue: string,
    message: PaymentExpired,
    envelope?: RabbitmqMessageEnvelope<PaymentExpired> | null
  ): Promise<void> {
    const messageKey = envelope?.messageId || envelope?.idempotencyKey;
    const isFreshMessage = await this.processedMessageRepository.registerProcessedMessage(
      PaymentExpiredConsumerHandler.name,
      messageKey
    );

    if (!isFreshMessage) {
      return;
    }

    const booking = await this.bookingRepository.findBookingByPaymentId(message.paymentId);
    if (!booking || booking.bookingStatus !== BookingStatus.PENDING_PAYMENT) {
      return;
    }

    const expiredAt = message.occurredAt ? new Date(message.occurredAt) : new Date();
    const expiredBooking = await this.bookingRepository.updateBooking(
      new Booking({
        ...booking,
        bookingStatus: BookingStatus.EXPIRED,
        expiredAt,
        updatedAt: expiredAt
      })
    );

    await this.rabbitmqPublisher.publishMessage(
      new SeatReleaseRequested({
        bookingId: expiredBooking.id,
        flightId: expiredBooking.flightId,
        seatNumber: expiredBooking.seatNumber,
        reason: SeatReleaseReason.BOOKING_EXPIRED,
        requestedAt: expiredAt
      })
    );
  }
}
