import 'reflect-metadata';
import request from 'supertest';
import { PassengerType } from '@/user/enums/passenger-type.enum';
import { Fixture, PublicHttpFixture } from '@tests/shared/fixtures/integration-test.fixture';
import { UserCreated } from 'building-blocks/contracts/identity.contract';

const buildRegisterRequest = (overrides: Record<string, unknown> = {}) => ({
  email: 'register.e2e@example.com',
  password: 'User@12345',
  name: 'Register E2E',
  passportNumber: 'B1234567',
  age: 21,
  passengerType: PassengerType.MALE,
  ...overrides
});

const waitForUserCreatedPublished = async (fixture: Fixture): Promise<boolean> => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await fixture.rabbitmqPublisher.isPublished(new UserCreated())) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return false;
};

describe('end-to-end test for register', () => {
  const publicHttpFixture = new PublicHttpFixture();
  let fixture: Fixture;

  beforeAll(async () => {
    fixture = await publicHttpFixture.initializeFixture();
  });

  afterAll(async () => {
    await publicHttpFixture.cleanUp();
  });

  it('should allow guests to register and return 201 with role USER', async () => {
    const response = await request(fixture.app.getHttpServer())
      .post('/api/v1/identity/register')
      .send(buildRegisterRequest())
      .expect(201);

    const isPublished = await waitForUserCreatedPublished(fixture);

    expect(response.body.role).toBe(0);
    expect(response.body.isEmailVerified).toBe(false);
    expect(isPublished).toBe(true);
  });

  it('should reject register payloads with extra role field', async () => {
    await request(fixture.app.getHttpServer())
      .post('/api/v1/identity/register')
      .send(buildRegisterRequest({
        email: 'register.extra-role@example.com',
        role: 1
      }))
      .expect(400);
  });

  it('should return 409 when email already exists', async () => {
    const payload = buildRegisterRequest({
      email: 'register.duplicate@example.com'
    });

    await request(fixture.app.getHttpServer())
      .post('/api/v1/identity/register')
      .send(payload)
      .expect(201);

    await request(fixture.app.getHttpServer())
      .post('/api/v1/identity/register')
      .send(payload)
      .expect(409);
  });
});
