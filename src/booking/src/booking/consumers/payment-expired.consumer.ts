import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RabbitmqMessageEnvelope } from 'building-blocks/contracts/message-envelope.contract';
import { PaymentExpired } from 'building-blocks/contracts/payment.contract';
import { IProcessedMessageRepository } from '@/booking/repositories/processed-message.repository';
import { Booking } from '@/booking/entities/booking.entity';
import { prepareOutboxMessage } from 'building-blocks/rabbitmq/outbox-message';
import { SeatReleaseReason, SeatReleaseRequested } from 'building-blocks/contracts/flight.contract';
import { BookingStatus } from '@/booking/enums/booking-status.enum';
import { ProcessedMessage } from '@/booking/entities/processed-message.entity';
import { OutboxMessage } from '@/booking/entities/outbox-message.entity';
import { BookingSeatWorkflowService } from '@/booking/services/booking-seat-workflow.service';

@Injectable()
export class PaymentExpiredConsumerHandler {
  constructor(
    @Inject('IProcessedMessageRepository') private readonly processedMessageRepository: IProcessedMessageRepository,
    private readonly dataSource: DataSource,
    private readonly bookingSeatWorkflowService: BookingSeatWorkflowService
  ) {}

  async handle(
    _queue: string,
    message: PaymentExpired,
    envelope?: RabbitmqMessageEnvelope<PaymentExpired> | null
  ): Promise<void> {
    const messageKey = envelope?.messageId || envelope?.idempotencyKey;
    const consumer = PaymentExpiredConsumerHandler.name;

    if (await this.processedMessageRepository.hasProcessedMessage(consumer, messageKey)) {
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      const processedMessageRepository = manager.getRepository(ProcessedMessage);
      const bookingRepository = manager.getRepository(Booking);
      const outboxRepository = manager.getRepository(OutboxMessage);
      const existingProcessedMessage = messageKey
        ? await processedMessageRepository.findOneBy({
            consumer,
            messageKey
          })
        : null;

      if (existingProcessedMessage) {
        return;
      }

      const booking = await bookingRepository
        .createQueryBuilder('booking')
        .setLock('pessimistic_write')
        .where('booking.paymentId = :paymentId', { paymentId: message.paymentId })
        .getOne();

      if (!booking) {
        throw new NotFoundException(`Booking for payment ${message.paymentId} not found`);
      }

      if (booking.bookingStatus === BookingStatus.PENDING_PAYMENT) {
        const expiredAt = message.occurredAt ? new Date(message.occurredAt) : new Date();
        await this.bookingSeatWorkflowService.expirePendingBooking(
          manager,
          booking,
          SeatReleaseReason.BOOKING_EXPIRED,
          expiredAt
        );
      }

      if (messageKey) {
        await processedMessageRepository.insert({
          consumer,
          messageKey,
          createdAt: new Date()
        });
      }
    });
  }
}
