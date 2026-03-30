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

    let releasedSeat = null;

    if (message.holdToken) {
      releasedSeat = await this.seatRepository.releaseSeatByHoldToken(
        message.flightId,
        message.seatNumber,
        message.holdToken
      );
    }

    if (!releasedSeat && message.bookingId) {
      releasedSeat = await this.seatRepository.releaseSeatByBookingId(
        message.flightId,
        message.seatNumber,
        message.bookingId
      );
    }

    if (!releasedSeat && !message.holdToken && !message.bookingId) {
      releasedSeat = await this.seatRepository.releaseLegacySeat(message.flightId, message.seatNumber);
    }

    if (!releasedSeat) {
      Logger.warn(
        `Seat ${message.seatNumber} for flight ${message.flightId} did not match a releasable state (${SeatReleaseReason[message.reason]}).`
      );
      return;
    }

    Logger.log(
      `Released seat ${message.seatNumber} for flight ${message.flightId} from queue ${queue} (${envelope?.messageId || 'legacy'}).`
    );
  }
}
