import 'reflect-metadata';
import { Fixture, IntegrationTestFixture } from '@tests/shared/fixtures/integration-test.fixture';
import { Register } from '@/auth/features/v1/register/register';
import { PassengerType } from '@/user/enums/passenger-type.enum';
import { Role, UserCreated } from 'building-blocks/contracts/identity.contract';

const waitForUserCreatedPublished = async (fixture: Fixture): Promise<boolean> => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await fixture.rabbitmqPublisher.isPublished(new UserCreated())) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return false;
};

describe('integration test for register', () => {
  const integrationTestFixture = new IntegrationTestFixture();
  let fixture: Fixture;

  beforeAll(async () => {
    fixture = await integrationTestFixture.initializeFixture();
  });

  afterAll(async () => {
    await integrationTestFixture.cleanUp();
  });

  it('should register a new user with role USER and publish UserCreated', async () => {
    const result = await fixture.commandBus.execute(
      new Register({
        email: 'register.integration@example.com',
        password: 'User@12345',
        name: 'Integration Register',
        passportNumber: 'B1234567',
        age: 19,
        passengerType: PassengerType.FEMALE
      })
    );

    const isPublished = await waitForUserCreatedPublished(fixture);
    const user = await fixture.userRepository.findUserById(result.id);

    expect(isPublished).toBe(true);
    expect(user).not.toBeNull();
    expect(user.role).toBe(Role.USER);
    expect(user.isEmailVerified).toBe(false);
  });
});
