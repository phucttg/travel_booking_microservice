import { PassengerType, UserUpdated } from 'building-blocks/contracts/identity.contract';
import { IPassengerRepository } from '@/data/repositories/passenger.repository';
import { Passenger } from '@/passenger/entities/passenger.entity';
import { UpdateUserConsumerHandler } from '@/user/consumers/update-user';

describe('unit test for update user consumer handler', () => {
  let handler: UpdateUserConsumerHandler;
  let passengerRepository: jest.Mocked<IPassengerRepository>;

  beforeEach(() => {
    passengerRepository = {
      createPassenger: jest.fn(),
      updatePassenger: jest.fn().mockResolvedValue(undefined),
      findPassengerById: jest.fn(),
      findPassengerByUserId: jest.fn(),
      findPassengers: jest.fn()
    } as unknown as jest.Mocked<IPassengerRepository>;

    handler = new UpdateUserConsumerHandler(passengerRepository);
  });

  it('should update an existing passenger from a sanitized UserUpdated event', async () => {
    const existingPassenger = new Passenger({
      id: 7,
      userId: 5,
      name: 'Old Name',
      passportNumber: 'OLD123456',
      age: 17,
      passengerType: PassengerType.UNKNOWN,
      createdAt: new Date('2026-03-29T00:00:00.000Z')
    });
    passengerRepository.findPassengerByUserId.mockResolvedValue(existingPassenger);

    const message = new UserUpdated({
      id: 5,
      email: 'user132@test.com',
      name: 'Phuc Truong',
      isEmailVerified: false,
      role: 0,
      passportNumber: 'A123214413',
      age: 18,
      passengerType: PassengerType.MALE,
      createdAt: new Date('2026-03-30T02:25:56.844Z'),
      updatedAt: new Date('2026-03-30T04:00:00.000Z')
    });

    await handler.handle('passenger service.user_updated', message, {
      messageId: 'message-2'
    } as never);

    expect(passengerRepository.findPassengerByUserId).toHaveBeenCalledWith(5);
    expect(passengerRepository.updatePassenger).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        userId: 5,
        name: 'Phuc Truong',
        passportNumber: 'A123214413',
        age: 18,
        passengerType: PassengerType.MALE
      })
    );
  });
});
