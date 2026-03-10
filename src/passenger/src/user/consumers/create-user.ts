import { Inject, Injectable, Logger } from '@nestjs/common';
import { Passenger } from '@/passenger/entities/passenger.entity';
import { IPassengerRepository } from '@/data/repositories/passenger.repository';
import { RabbitmqMessageEnvelope } from 'building-blocks/contracts/message-envelope.contract';
import { UserCreated } from 'building-blocks/contracts/identity.contract';

@Injectable()
export class CreateUserConsumerHandler {
  constructor(
    @Inject('IPassengerRepository') private readonly passengerRepository: IPassengerRepository
  ) {}

  async handle(
    queue: string,
    message: UserCreated,
    envelope?: RabbitmqMessageEnvelope<UserCreated> | null
  ): Promise<void> {
    const existingPassenger = await this.passengerRepository.findPassengerByUserId(message.id);

    if (existingPassenger) {
      Logger.warn(`Passenger for user ${message.id} already exists. Skipping duplicated event.`);
      return;
    }

    const passenger = await this.passengerRepository.createPassenger(
      new Passenger({
        userId: message.id,
        name: message.name,
        passportNumber: message.passportNumber,
        age: message.age,
        passengerType: message.passengerType
      })
    );

    Logger.log(
      `Passenger with name: ${passenger?.name} created from queue ${queue} (${envelope?.messageId || 'legacy'}).`
    );
  }
}
