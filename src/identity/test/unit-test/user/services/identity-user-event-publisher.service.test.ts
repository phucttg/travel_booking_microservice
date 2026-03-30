import { UserCreated, UserDeleted, UserUpdated } from 'building-blocks/contracts/identity.contract';
import { deserializeObject } from 'building-blocks/utils/serilization';
import { DataSource } from 'typeorm';
import { FakeUser } from '@tests/shared/fakes/user/fake-user.entity';
import { OutboxMessage } from '@/user/entities/outbox-message.entity';
import { IdentityUserEventPublisherService } from '@/user/services/identity-user-event-publisher.service';

describe('unit test for identity user event publisher service', () => {
  let service: IdentityUserEventPublisherService;
  let outboxRepository: { insert: jest.Mock };

  beforeEach(() => {
    outboxRepository = {
      insert: jest.fn().mockResolvedValue(undefined)
    };
    const dataSource = {
      manager: {
        getRepository: jest.fn((entity) => {
          if (entity === OutboxMessage) {
            return outboxRepository;
          }

          throw new Error('Unexpected repository');
        })
      }
    } as unknown as DataSource;

    service = new IdentityUserEventPublisherService(dataSource);
  });

  it('should enqueue a sanitized UserCreated event with envelope enabled', async () => {
    const user = FakeUser.generate();

    await service.publishUserCreated(user);

    expect(outboxRepository.insert).toHaveBeenCalledWith(expect.objectContaining({ useEnvelope: true }));

    const publishedEvent = deserializeObject<Record<string, unknown>>(outboxRepository.insert.mock.calls[0][0].payload);
    expect(publishedEvent).toEqual(expect.objectContaining({ id: user.id }));
    expect(outboxRepository.insert.mock.calls[0][0]).toEqual(expect.objectContaining({ exchangeName: 'user_created' }));
    expect(publishedEvent).not.toHaveProperty('password');
    expect(publishedEvent).not.toHaveProperty('tokens');
  });

  it('should enqueue a sanitized UserUpdated event with envelope enabled', async () => {
    const user = FakeUser.generate();

    await service.publishUserUpdated(user);

    expect(outboxRepository.insert).toHaveBeenCalledWith(expect.objectContaining({ useEnvelope: true }));

    const publishedEvent = deserializeObject<Record<string, unknown>>(outboxRepository.insert.mock.calls[0][0].payload);
    expect(outboxRepository.insert.mock.calls[0][0]).toEqual(expect.objectContaining({ exchangeName: 'user_updated' }));
    expect(publishedEvent).not.toHaveProperty('password');
    expect(publishedEvent).not.toHaveProperty('tokens');
  });

  it('should enqueue a sanitized UserDeleted event with envelope enabled', async () => {
    const user = FakeUser.generate();

    await service.publishUserDeleted(user);

    expect(outboxRepository.insert).toHaveBeenCalledWith(expect.objectContaining({ useEnvelope: true }));

    const publishedEvent = deserializeObject<Record<string, unknown>>(outboxRepository.insert.mock.calls[0][0].payload);
    expect(outboxRepository.insert.mock.calls[0][0]).toEqual(expect.objectContaining({ exchangeName: 'user_deleted' }));
    expect(publishedEvent).not.toHaveProperty('password');
    expect(publishedEvent).not.toHaveProperty('tokens');
    expect(publishedEvent).not.toHaveProperty('age');
    expect(publishedEvent).not.toHaveProperty('passengerType');
  });
});
