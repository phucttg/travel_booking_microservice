import { ConflictException } from '@nestjs/common';
import * as TypeMoq from 'typemoq';
import { FakeUser } from '@tests/shared/fakes/user/fake-user.entity';
import { User } from '@/user/entities/user.entity';
import { IUserRepository } from '@/data/repositories/user.repository';
import { IdentityUserWriteService } from '@/user/services/identity-user-write.service';
import { Role } from '@/user/enums/role.enum';
import { PassengerType } from '@/user/enums/passenger-type.enum';
import { IdentityUserEventPublisherService } from '@/user/services/identity-user-event-publisher.service';

describe('unit test for identity user write service', () => {
  let identityUserWriteService: IdentityUserWriteService;

  const fakeUser: User = FakeUser.generate({
    role: Role.USER,
    passengerType: PassengerType.UNKNOWN,
    isEmailVerified: false
  });

  const mockUserRepository: TypeMoq.IMock<IUserRepository> = TypeMoq.Mock.ofType<IUserRepository>();
  const mockPublisher: TypeMoq.IMock<IdentityUserEventPublisherService> =
    TypeMoq.Mock.ofType<IdentityUserEventPublisherService>();

  beforeEach(() => {
    mockUserRepository.reset();
    mockPublisher.reset();
    identityUserWriteService = new IdentityUserWriteService(mockUserRepository.object, mockPublisher.object);
  });

  it('should create a user, publish UserCreated and return mapped dto', async () => {
    mockUserRepository
      .setup((x) => x.findUserByEmail(TypeMoq.It.isAnyString()))
      .returns(() => Promise.resolve(null));
    mockUserRepository
      .setup((x) => x.createUser(TypeMoq.It.isAnyObject(User)))
      .returns(() => Promise.resolve(fakeUser));
    mockPublisher
      .setup((x) => x.publishUserCreated(TypeMoq.It.isAny()))
      .returns(() => Promise.resolve());

    const result = await identityUserWriteService.createUser({
      email: fakeUser.email,
      password: 'Admin@1234',
      name: fakeUser.name,
      role: fakeUser.role,
      passportNumber: fakeUser.passportNumber,
      age: fakeUser.age,
      passengerType: fakeUser.passengerType,
      isEmailVerified: false
    });

    mockPublisher.verify(
      (x) => x.publishUserCreated(TypeMoq.It.isAny()),
      TypeMoq.Times.once()
    );
    expect(result.email).toBe(fakeUser.email);
    expect(result.role).toBe(Role.USER);
    expect(result.isEmailVerified).toBe(false);
  });

  it('should translate duplicate unique email save errors into 409 conflict', async () => {
    mockUserRepository
      .setup((x) => x.findUserByEmail(TypeMoq.It.isAnyString()))
      .returns(() => Promise.resolve(null));
    mockUserRepository
      .setup((x) => x.createUser(TypeMoq.It.isAnyObject(User)))
      .returns(() =>
        Promise.reject({
          driverError: {
            code: '23505',
            constraint: 'UQ_user_email'
          }
        })
      );

    await expect(
      identityUserWriteService.createUser({
        email: 'duplicate@example.com',
        password: 'Admin@1234',
        name: 'Duplicate User',
        role: Role.USER,
        passportNumber: 'B1234567',
        age: 18,
        passengerType: PassengerType.UNKNOWN,
        isEmailVerified: false
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
