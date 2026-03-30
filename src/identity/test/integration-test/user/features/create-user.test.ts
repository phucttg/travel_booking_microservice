import 'reflect-metadata';
import {Fixture, IntegrationTestFixture} from '@tests/shared/fixtures/integration-test.fixture';
import {FakeCreateUser} from '@tests/shared/fakes/user/fake-create-user';
import {UserCreated} from "building-blocks/contracts/identity.contract";

const waitForUserCreatedPublished = async (fixture: Fixture): Promise<boolean> => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await fixture.rabbitmqPublisher.isPublished(new UserCreated())) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return false;
};

describe('integration test for create user', () => {
  const integrationTestFixture = new IntegrationTestFixture();
  let fixture: Fixture;

  beforeAll(async () => {
    fixture  = await integrationTestFixture.initializeFixture() as Fixture;;
  });

  afterAll(async () => {
    await integrationTestFixture.cleanUp();
  });

  it('should create user and retrieve a user from the database', async () => {
    const result = await fixture.commandBus.execute(FakeCreateUser.generate());

    const isPublished = await waitForUserCreatedPublished(fixture);
    expect(isPublished).toBe(true);

    const user = await fixture.userRepository.findUserById(result.id);
    expect(user).not.toBeNull();
  });
});
