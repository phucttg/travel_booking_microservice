import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  SeatCommitRequested
} from 'building-blocks/contracts/flight.contract';
import { RabbitmqMessageEnvelope } from 'building-blocks/contracts/message-envelope.contract';
import { ISeatRepository } from '@/data/repositories/seatRepository';
import { IProcessedMessageRepository } from '@/data/repositories/processedMessageRepository';

@Injectable()
export class SeatCommitRequestedConsumerHandler {
  constructor(
    @Inject('ISeatRepository') private readonly seatRepository: ISeatRepository,
    @Inject('IProcessedMessageRepository') private readonly processedMessageRepository: IProcessedMessageRepository
  ) {}

  async handle(
    queue: string,
    message: SeatCommitRequested,
    envelope?: RabbitmqMessageEnvelope<SeatCommitRequested> | null
  ): Promise<void> {
    const messageKey = envelope?.messageId || envelope?.idempotencyKey;
    const isFreshMessage = await this.processedMessageRepository.registerProcessedMessage(
      SeatCommitRequestedConsumerHandler.name,
      messageKey
    );

    if (!isFreshMessage) {
      return;
    }

    const committedSeat = await this.seatRepository.commitSeat(
      message.flightId,
      message.seatNumber,
      message.holdToken,
      message.bookingId
    );

    if (!committedSeat) {
      Logger.warn(
        `Seat commit rejected for seat ${message.seatNumber} on flight ${message.flightId} (booking ${message.bookingId}).`
      );
      return;
    }

    Logger.log(
      `Committed seat ${message.seatNumber} for flight ${message.flightId} from queue ${queue} (${envelope?.messageId || 'legacy'}).`
    );
  }
}
