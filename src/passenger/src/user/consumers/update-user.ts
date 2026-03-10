import { Inject, Injectable, Logger } from '@nestjs/common';
import { IPassengerRepository } from '@/data/repositories/passenger.repository';
import { Passenger } from '@/passenger/entities/passenger.entity';
import { RabbitmqMessageEnvelope } from 'building-blocks/contracts/message-envelope.contract';
import { UserUpdated } from 'building-blocks/contracts/identity.contract';

@Injectable()
export class UpdateUserConsumerHandler {
  constructor(
    @Inject('IPassengerRepository') private readonly passengerRepository: IPassengerRepository
  ) {}

  async handle(
    queue: string,
    message: UserUpdated,
    envelope?: RabbitmqMessageEnvelope<UserUpdated> | null
  ): Promise<void> {
    const existingPassenger = await this.passengerRepository.findPassengerByUserId(message.id);

    if (!existingPassenger) {
      Logger.warn(`Passenger for user ${message.id} not found. Skipping update event.`);
      return;
    }

    await this.passengerRepository.updatePassenger(
      new Passenger({
        ...existingPassenger,
        id: existingPassenger.id,
        userId: existingPassenger.userId,
        name: message.name,
        passportNumber: message.passportNumber,
        age: message.age,
        passengerType: message.passengerType,
        createdAt: existingPassenger.createdAt,
        updatedAt: new Date()
      })
    );

    Logger.log(
      `Passenger with userId: ${message.id} updated from queue ${queue} (${envelope?.messageId || 'legacy'}).`
    );
  }
}
