import { Inject, Injectable } from '@nestjs/common';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import { User } from '@/user/entities/user.entity';
import {
  mapUserToUserCreatedEvent,
  mapUserToUserDeletedEvent,
  mapUserToUserUpdatedEvent
} from '@/user/events/user-event.mapper';

@Injectable()
export class IdentityUserEventPublisherService {
  constructor(
    @Inject('IRabbitmqPublisher') private readonly rabbitmqPublisher: IRabbitmqPublisher
  ) {}

  async publishUserCreated(user: User): Promise<void> {
    await this.rabbitmqPublisher.publishMessage(mapUserToUserCreatedEvent(user), {
      useEnvelope: true
    });
  }

  async publishUserUpdated(user: User): Promise<void> {
    await this.rabbitmqPublisher.publishMessage(mapUserToUserUpdatedEvent(user), {
      useEnvelope: true
    });
  }

  async publishUserDeleted(user: User): Promise<void> {
    await this.rabbitmqPublisher.publishMessage(mapUserToUserDeletedEvent(user), {
      useEnvelope: true
    });
  }
}
