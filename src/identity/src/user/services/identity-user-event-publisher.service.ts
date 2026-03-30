import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { prepareOutboxMessage } from 'building-blocks/rabbitmq/outbox-message';
import { User } from '@/user/entities/user.entity';
import {
  mapUserToUserCreatedEvent,
  mapUserToUserDeletedEvent,
  mapUserToUserUpdatedEvent
} from '@/user/events/user-event.mapper';
import { OutboxMessage } from '@/user/entities/outbox-message.entity';

@Injectable()
export class IdentityUserEventPublisherService {
  constructor(private readonly dataSource: DataSource) {}

  async publishUserCreated(user: User, manager?: EntityManager): Promise<void> {
    await this.enqueueEvent(mapUserToUserCreatedEvent(user), manager);
  }

  async publishUserUpdated(user: User, manager?: EntityManager): Promise<void> {
    await this.enqueueEvent(mapUserToUserUpdatedEvent(user), manager);
  }

  async publishUserDeleted(user: User, manager?: EntityManager): Promise<void> {
    await this.enqueueEvent(mapUserToUserDeletedEvent(user), manager);
  }

  private async enqueueEvent(message: object, manager?: EntityManager): Promise<void> {
    const outboxRepository = (manager ?? this.dataSource.manager).getRepository(OutboxMessage);

    await outboxRepository.insert(prepareOutboxMessage(message, { useEnvelope: true }));
  }
}
