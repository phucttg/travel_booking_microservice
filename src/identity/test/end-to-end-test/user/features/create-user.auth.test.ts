import 'reflect-metadata';
import request from 'supertest';
import { FakeCreateUserRequestDto } from '@tests/shared/fakes/user/fake-create-user-request.dto';
import {
  Fixture,
  ProtectedHttpFixture,
  PublicHttpFixture
} from '@tests/shared/fixtures/integration-test.fixture';
import { Role } from '@/user/enums/role.enum';

describe('end-to-end auth test for create user', () => {
  const publicHttpFixture = new PublicHttpFixture();
  const protectedHttpFixture = new ProtectedHttpFixture({userId: 1, role: Role.ADMIN});
  let publicFixture: Fixture;
  let protectedFixture: Fixture;

  beforeAll(async () => {
    publicFixture = await publicHttpFixture.initializeFixture();
    protectedFixture = await protectedHttpFixture.initializeFixture();
  });

  afterAll(async () => {
    await publicHttpFixture.cleanUp();
    await protectedHttpFixture.cleanUp();
  });

  it('should reject guests calling create user with 401', async () => {
    await request(publicFixture.app.getHttpServer())
      .post('/api/v1/user/create')
      .send(FakeCreateUserRequestDto.generate())
      .expect(401);
  });

  it('should reject authenticated non-admins with 403', async () => {
    protectedFixture.setAuthenticatedUser?.({userId: 2, role: Role.USER});

    await request(protectedFixture.app.getHttpServer())
      .post('/api/v1/user/create')
      .send(FakeCreateUserRequestDto.generate())
      .expect(403);
  });
});
