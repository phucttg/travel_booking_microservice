import { UserDto } from '@/user/dtos/user.dto';
import { FakeCreateUser } from '@tests/shared/fakes/user/fake-create-user';
import { CreateUserHandler } from '@/user/features/v1/create-user/create-user';
import { IdentityUserWriteService } from '@/user/services/identity-user-write.service';

describe('unit test for create user', () => {
  let createUserHandler: CreateUserHandler;
  let identityUserWriteService: jest.Mocked<IdentityUserWriteService>;

  const fakeUserDto = new UserDto({
    id: 1,
    email: 'user@example.com',
    name: 'Test User'
  });

  beforeEach(() => {
    identityUserWriteService = {
      createUser: jest.fn()
    } as unknown as jest.Mocked<IdentityUserWriteService>;
    createUserHandler = new CreateUserHandler(identityUserWriteService);
  });

  it('should create a user and retrieve a valid data', async () => {
    const createUserCommand = FakeCreateUser.generate();
    identityUserWriteService.createUser.mockResolvedValue(fakeUserDto);

    const result: UserDto = await createUserHandler.execute(createUserCommand);

    expect(identityUserWriteService.createUser).toHaveBeenCalledWith({
      ...createUserCommand,
      isEmailVerified: false
    });
    expect(result).not.toBeNull();
  });
});
