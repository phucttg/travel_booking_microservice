import 'reflect-metadata';
import { EndToEndTestFixture } from '@tests/shared/fixtures/end-to-end.fixture';
import { Fixture } from '@tests/shared/fixtures/integration-test.fixture';
import { FakeCreateUserRequestDto } from '@tests/shared/fakes/user/fake-create-user-request.dto';
import request from "supertest";

describe('end-to-end test for create user', () => {
  const endToEndFixture = new EndToEndTestFixture();
  let fixture: Fixture;

  beforeAll(async () => {
    fixture = await endToEndFixture.initializeFixture();
  });

  afterAll(async () => {
    await endToEndFixture.cleanUp();
  });

  it('should create user and retrieve 201 status code', async () => {
     await request(fixture.app.getHttpServer())
      .post('/api/v1/user/create')
      .send(FakeCreateUserRequestDto.generate())
      .expect(201);
  });

  it('should reject invalid create user payload with 400 status code', async () => {
    const invalidRequest = {
      ...FakeCreateUserRequestDto.generate(),
      email: 'invalid-email',
      name: 'a'
    };

    await request(fixture.app.getHttpServer())
      .post('/api/v1/user/create')
      .send(invalidRequest)
      .expect(400);
  });
});
