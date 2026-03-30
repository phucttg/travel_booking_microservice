import { UserCreated, UserDeleted, UserUpdated } from 'building-blocks/contracts/identity.contract';
import { IRabbitmqPublisher } from 'building-blocks/rabbitmq/rabbitmq-publisher';
import { FakeUser } from '@tests/shared/fakes/user/fake-user.entity';
import { IdentityUserEventPublisherService } from '@/user/services/identity-user-event-publisher.service';

describe('unit test for identity user event publisher service', () => {
  let service: IdentityUserEventPublisherService;
  let rabbitmqPublisher: jest.Mocked<IRabbitmqPublisher>;

  beforeEach(() => {
    rabbitmqPublisher = {
      publishMessage: jest.fn().mockResolvedValue(undefined),
      isPublished: jest.fn()
    } as unknown as jest.Mocked<IRabbitmqPublisher>;

    service = new IdentityUserEventPublisherService(rabbitmqPublisher);
  });

  it('should publish a sanitized UserCreated event with envelope enabled', async () => {
    const user = FakeUser.generate();

    await service.publishUserCreated(user);

    expect(rabbitmqPublisher.publishMessage).toHaveBeenCalledWith(
      expect.any(UserCreated),
      expect.objectContaining({ useEnvelope: true })
    );

    const publishedEvent = rabbitmqPublisher.publishMessage.mock.calls[0][0] as Record<string, unknown>;
    expect(publishedEvent).not.toHaveProperty('password');
    expect(publishedEvent).not.toHaveProperty('tokens');
  });

  it('should publish a sanitized UserUpdated event with envelope enabled', async () => {
    const user = FakeUser.generate();

    await service.publishUserUpdated(user);

    expect(rabbitmqPublisher.publishMessage).toHaveBeenCalledWith(
      expect.any(UserUpdated),
      expect.objectContaining({ useEnvelope: true })
    );

    const publishedEvent = rabbitmqPublisher.publishMessage.mock.calls[0][0] as Record<string, unknown>;
    expect(publishedEvent).not.toHaveProperty('password');
    expect(publishedEvent).not.toHaveProperty('tokens');
  });

  it('should publish a sanitized UserDeleted event with envelope enabled', async () => {
    const user = FakeUser.generate();

    await service.publishUserDeleted(user);

    expect(rabbitmqPublisher.publishMessage).toHaveBeenCalledWith(
      expect.any(UserDeleted),
      expect.objectContaining({ useEnvelope: true })
    );

    const publishedEvent = rabbitmqPublisher.publishMessage.mock.calls[0][0] as Record<string, unknown>;
    expect(publishedEvent).not.toHaveProperty('password');
    expect(publishedEvent).not.toHaveProperty('tokens');
    expect(publishedEvent).not.toHaveProperty('age');
    expect(publishedEvent).not.toHaveProperty('passengerType');
  });
});
