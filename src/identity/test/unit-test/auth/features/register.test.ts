import { UserDto } from '@/user/dtos/user.dto';
import { Register, RegisterHandler } from '@/auth/features/v1/register/register';
import { IdentityUserWriteService } from '@/user/services/identity-user-write.service';
import { Role } from '@/user/enums/role.enum';
import { PassengerType } from '@/user/enums/passenger-type.enum';

describe('unit test for register', () => {
  let registerHandler: RegisterHandler;
  let identityUserWriteService: jest.Mocked<IdentityUserWriteService>;

  beforeEach(() => {
    identityUserWriteService = {
      createUser: jest.fn()
    } as unknown as jest.Mocked<IdentityUserWriteService>;
    registerHandler = new RegisterHandler(identityUserWriteService);
  });

  it('should always force role USER and isEmailVerified false', async () => {
    const command = new Register({
      email: 'user@example.com',
      password: 'User@12345',
      name: 'Registered User',
      passportNumber: 'B1234567',
      age: 20,
      passengerType: PassengerType.FEMALE
    });
    const expectedUser = new UserDto({
      id: 1,
      email: command.email,
      name: command.name,
      role: Role.USER,
      isEmailVerified: false
    });

    identityUserWriteService.createUser.mockResolvedValue(expectedUser);

    const result = await registerHandler.execute(command);

    expect(identityUserWriteService.createUser).toHaveBeenCalledWith({
      ...command,
      role: Role.USER,
      isEmailVerified: false
    });
    expect(result).toBe(expectedUser);
  });
});
