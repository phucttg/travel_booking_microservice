import { NotFoundException } from '@nestjs/common';
import { IUserRepository } from '@/data/repositories/user.repository';
import { FakeUser } from '@tests/shared/fakes/user/fake-user.entity';
import { PassengerSyncRepairService } from '@/tools/passenger-sync-repair.service';
import { IdentityUserEventPublisherService } from '@/user/services/identity-user-event-publisher.service';

describe('unit test for passenger sync repair service', () => {
  let service: PassengerSyncRepairService;
  let userRepository: jest.Mocked<IUserRepository>;
  let eventPublisher: jest.Mocked<IdentityUserEventPublisherService>;

  beforeEach(() => {
    userRepository = {
      createUser: jest.fn(),
      updateUser: jest.fn(),
      findUsers: jest.fn(),
      findUserByName: jest.fn(),
      findUserByEmail: jest.fn(),
      findUserById: jest.fn(),
      getAllUsers: jest.fn(),
      removeUser: jest.fn()
    } as unknown as jest.Mocked<IUserRepository>;

    eventPublisher = {
      publishUserCreated: jest.fn().mockResolvedValue(undefined),
      publishUserUpdated: jest.fn(),
      publishUserDeleted: jest.fn()
    } as unknown as jest.Mocked<IdentityUserEventPublisherService>;

    service = new PassengerSyncRepairService(userRepository, eventPublisher);
  });

  it('should republish a sanitized UserCreated event for a single user', async () => {
    const user = FakeUser.generate({ id: 5 });
    userRepository.findUserById.mockResolvedValue(user);

    const result = await service.repair({ userId: 5 });

    expect(userRepository.findUserById).toHaveBeenCalledWith(5);
    expect(eventPublisher.publishUserCreated).toHaveBeenCalledWith(user);
    expect(result).toEqual({
      mode: 'single',
      userIds: [5],
      publishedCount: 1
    });
  });

  it('should republish sanitized UserCreated events for all users', async () => {
    const users = [FakeUser.generate({ id: 1 }), FakeUser.generate({ id: 2 })];
    userRepository.getAllUsers.mockResolvedValue(users);

    const result = await service.repair({ all: true });

    expect(userRepository.getAllUsers).toHaveBeenCalled();
    expect(eventPublisher.publishUserCreated).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      mode: 'all',
      userIds: [1, 2],
      publishedCount: 2
    });
  });

  it('should throw when a targeted user does not exist', async () => {
    userRepository.findUserById.mockResolvedValue(null);

    await expect(service.repair({ userId: 404 })).rejects.toBeInstanceOf(NotFoundException);
    expect(eventPublisher.publishUserCreated).not.toHaveBeenCalled();
  });
});
