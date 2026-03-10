import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  SeatReleaseReason,
  SeatReleaseRequested
} from 'building-blocks/contracts/flight.contract';
import { RabbitmqMessageEnvelope } from 'building-blocks/contracts/message-envelope.contract';
import { ISeatRepository } from '@/data/repositories/seatRepository';

@Injectable()
export class SeatReleaseRequestedConsumerHandler {
  constructor(@Inject('ISeatRepository') private readonly seatRepository: ISeatRepository) {}

  async handle(
    queue: string,
    message: SeatReleaseRequested,
    envelope?: RabbitmqMessageEnvelope<SeatReleaseRequested> | null
  ): Promise<void> {
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
