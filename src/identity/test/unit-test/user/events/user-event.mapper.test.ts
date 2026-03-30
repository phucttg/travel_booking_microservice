import { FakeUser } from '@tests/shared/fakes/user/fake-user.entity';
import {
  mapUserToUserCreatedEvent,
  mapUserToUserDeletedEvent,
  mapUserToUserUpdatedEvent
} from '@/user/events/user-event.mapper';

describe('unit test for user event mapper', () => {
  it('should map a user into a sanitized UserCreated event payload', () => {
    const user = FakeUser.generate();

    const event = mapUserToUserCreatedEvent(user) as unknown as Record<string, unknown>;

    expect(event).toMatchObject({
      id: user.id,
      email: user.email,
      name: user.name,
      isEmailVerified: user.isEmailVerified,
      role: user.role,
      passportNumber: user.passportNumber,
      age: user.age,
      passengerType: user.passengerType,
      createdAt: user.createdAt,
      updatedAt: undefined
    });
    expect(event).not.toHaveProperty('password');
    expect(event).not.toHaveProperty('tokens');
  });

  it('should map a user into a sanitized UserUpdated event payload', () => {
    const user = FakeUser.generate();

    const event = mapUserToUserUpdatedEvent(user) as unknown as Record<string, unknown>;

    expect(event).toMatchObject({
      id: user.id,
      email: user.email,
      name: user.name,
      passportNumber: user.passportNumber,
      age: user.age,
      passengerType: user.passengerType
    });
    expect(event).not.toHaveProperty('password');
    expect(event).not.toHaveProperty('tokens');
  });

  it('should map a user into a sanitized UserDeleted event payload without non-contract fields', () => {
    const user = FakeUser.generate();

    const event = mapUserToUserDeletedEvent(user) as unknown as Record<string, unknown>;

    expect(event).toMatchObject({
      id: user.id,
      email: user.email,
      name: user.name,
      isEmailVerified: user.isEmailVerified,
      role: user.role,
      passportNumber: user.passportNumber,
      createdAt: user.createdAt
    });
    expect(event).not.toHaveProperty('password');
    expect(event).not.toHaveProperty('tokens');
    expect(event).not.toHaveProperty('age');
    expect(event).not.toHaveProperty('passengerType');
  });
});
