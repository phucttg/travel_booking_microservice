import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RabbitmqMessageEnvelope } from 'building-blocks/contracts/message-envelope.contract';
import {
  BookingCreated,
  BookingStatus
} from 'building-blocks/contracts/booking.contract';
import {
  PaymentRefundRequested,
  PaymentSucceeded
} from 'building-blocks/contracts/payment.contract';
import { IProcessedMessageRepository } from '@/booking/repositories/processed-message.repository';
import { Booking } from '@/booking/entities/booking.entity';
import { prepareOutboxMessage } from 'building-blocks/rabbitmq/outbox-message';
import { ProcessedMessage } from '@/booking/entities/processed-message.entity';
import { OutboxMessage } from '@/booking/entities/outbox-message.entity';
import { BookingSeatWorkflowService } from '@/booking/services/booking-seat-workflow.service';

@Injectable()
export class PaymentSucceededConsumerHandler {
  constructor(
    @Inject('IProcessedMessageRepository') private readonly processedMessageRepository: IProcessedMessageRepository,
    private readonly dataSource: DataSource,
    private readonly bookingSeatWorkflowService: BookingSeatWorkflowService
  ) {}

  async handle(
    _queue: string,
    message: PaymentSucceeded,
    envelope?: RabbitmqMessageEnvelope<PaymentSucceeded> | null
  ): Promise<void> {
    const messageKey = envelope?.messageId || envelope?.idempotencyKey;
    const consumer = PaymentSucceededConsumerHandler.name;

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

      if ([BookingStatus.CANCELED, BookingStatus.EXPIRED].includes(booking.bookingStatus)) {
        await this.bookingSeatWorkflowService.enqueueRefund(
          manager,
          new Booking({
            ...booking,
            paymentId: message.paymentId
          }),
          'Payment completed after booking stopped being active',
          new Date()
        );
      } else if (booking.bookingStatus !== BookingStatus.CONFIRMED) {
        const confirmedAt = message.occurredAt ? new Date(message.occurredAt) : new Date();
        const confirmedBooking = await bookingRepository.save(
          new Booking({
            ...booking,
            bookingStatus: BookingStatus.CONFIRMED,
            confirmedAt,
            seatCommitRequestedAt: booking.seatHoldToken ? confirmedAt : booking.seatCommitRequestedAt,
            updatedAt: confirmedAt
          })
        );

        if (confirmedBooking.seatHoldToken) {
          await this.bookingSeatWorkflowService.enqueueSeatCommit(manager, confirmedBooking, confirmedAt);
        }

        await outboxRepository.insert(
          prepareOutboxMessage(
            new BookingCreated({
              ...confirmedBooking
            }),
            {
              occurredAt: confirmedAt
            }
          )
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
