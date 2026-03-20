import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  SeatReleaseReason,
  SeatReleaseRequested
} from 'building-blocks/contracts/flight.contract';
import { RabbitmqMessageEnvelope } from 'building-blocks/contracts/message-envelope.contract';
import { ISeatRepository } from '@/data/repositories/seatRepository';
import { IProcessedMessageRepository } from '@/data/repositories/processedMessageRepository';

@Injectable()
export class SeatReleaseRequestedConsumerHandler {
  constructor(
    @Inject('ISeatRepository') private readonly seatRepository: ISeatRepository,
    @Inject('IProcessedMessageRepository') private readonly processedMessageRepository: IProcessedMessageRepository
  ) {}

  async handle(
    queue: string,
    message: SeatReleaseRequested,
    envelope?: RabbitmqMessageEnvelope<SeatReleaseRequested> | null
  ): Promise<void> {
    const messageKey = envelope?.messageId || envelope?.idempotencyKey;
    const isFreshMessage = await this.processedMessageRepository.registerProcessedMessage(
      SeatReleaseRequestedConsumerHandler.name,
      messageKey
    );

    if (!isFreshMessage) {
      return;
    }

    const releasedSeat = await this.seatRepository.releaseSeat(message.flightId, message.seatNumber);

    if (!releasedSeat) {
      Logger.warn(
        `Seat ${message.seatNumber} for flight ${message.flightId} was already available (${SeatReleaseReason[message.reason]}).`
      );
      return;
    }

    Logger.log(
      `Released seat ${message.seatNumber} for flight ${message.flightId} from queue ${queue} (${envelope?.messageId || 'legacy'}).`
    );
  }
}
