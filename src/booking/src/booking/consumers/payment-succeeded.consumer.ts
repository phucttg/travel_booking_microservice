import { Inject, Injectable } from '@nestjs/common';
import { RabbitmqMessageEnvelope } from 'building-blocks/contracts/message-envelope.contract';
import {
  BookingCreated,
  BookingStatus
} from 'building-blocks/contracts/booking.contract';
import {
  PaymentRefundRequested,
  PaymentSucceeded
} from 'building-blocks/contracts/payment.contract';
import { IBookingRepository } from '@/data/repositories/booking.repository';
import { IProcessedMessageRepository } from '@/booking/repositories/processed-message.repository';
import { Booking } from '@/booking/entities/booking.entity';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';

@Injectable()
export class PaymentSucceededConsumerHandler {
  constructor(
    @Inject('IBookingRepository') private readonly bookingRepository: IBookingRepository,
    @Inject('IProcessedMessageRepository') private readonly processedMessageRepository: IProcessedMessageRepository,
    @Inject('IRabbitmqPublisher') private readonly rabbitmqPublisher: IRabbitmqPublisher
  ) {}

  async handle(
    _queue: string,
    message: PaymentSucceeded,
    envelope?: RabbitmqMessageEnvelope<PaymentSucceeded> | null
  ): Promise<void> {
    const messageKey = envelope?.messageId || envelope?.idempotencyKey;
    const isFreshMessage = await this.processedMessageRepository.registerProcessedMessage(
      PaymentSucceededConsumerHandler.name,
      messageKey
    );

    if (!isFreshMessage) {
      return;
    }

    const booking = await this.bookingRepository.findBookingByPaymentId(message.paymentId);
    if (!booking) {
      return;
    }

    if ([BookingStatus.CANCELED, BookingStatus.EXPIRED].includes(booking.bookingStatus)) {
      await this.rabbitmqPublisher.publishMessage(
        new PaymentRefundRequested({
          paymentId: message.paymentId,
          bookingId: booking.id,
          userId: booking.userId,
          amount: booking.price,
          currency: booking.currency,
          reason: 'Payment completed after booking stopped being active',
          requestedAt: new Date()
        })
      );
      return;
    }

    if (booking.bookingStatus === BookingStatus.CONFIRMED) {
      return;
    }

    const confirmedAt = message.occurredAt ? new Date(message.occurredAt) : new Date();
    const confirmedBooking = await this.bookingRepository.updateBooking(
      new Booking({
        ...booking,
        bookingStatus: BookingStatus.CONFIRMED,
        confirmedAt,
        updatedAt: confirmedAt
      })
    );

    await this.rabbitmqPublisher.publishMessage(
      new BookingCreated({
        ...confirmedBooking
      })
    );
  }
}
