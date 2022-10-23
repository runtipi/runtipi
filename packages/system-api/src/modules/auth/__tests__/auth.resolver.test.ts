import { faker } from '@faker-js/faker';
import jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import TipiCache from '../../../config/TipiCache';
import { getConfig } from '../../../core/config/TipiConfig';
import { setupConnection, teardownConnection } from '../../../test/connection';
import { gcall } from '../../../test/gcall';
import { loginMutation, registerMutation } from '../../../test/mutations';
import { isConfiguredQuery, MeQuery, refreshTokenQuery } from '../../../test/queries';
import User from '../../auth/user.entity';
import { TokenResponse } from '../auth.types';
import { createUser } from './user.factory';

jest.mock('redis');

let db: DataSource | null = null;
const TEST_SUITE = 'authresolver';

beforeAll(async () => {
  db = await setupConnection(TEST_SUITE);
});

afterAll(async () => {
  await db?.destroy();
  await teardownConnection(TEST_SUITE);
});

beforeEach(async () => {
  jest.resetModules();
  jest.resetAllMocks();
  jest.restoreAllMocks();
  await User.clear();
});

describe('Test: me', () => {
  const email = faker.internet.email();
  let user1: User;

  beforeEach(async () => {
    user1 = await createUser(email);
  });

  it('should return null if no user is logged in', async () => {
    const { data } = await gcall<{ me: User }>({
      source: MeQuery,
    });

    expect(data?.me).toBeNull();
  });

  it('should return the user if a user is logged in', async () => {
    const { data } = await gcall<{ me: User | null }>({
      source: MeQuery,
      userId: user1.id,
    });

    expect(data?.me?.username).toEqual(user1.username);
  });
});

describe('Test: register', () => {
  const email = faker.internet.email();
  const password = faker.internet.password();

  it('should register a user', async () => {
    const { data } = await gcall<{ register: TokenResponse }>({
      source: registerMutation,
      variableValues: {
        input: { username: email, password },
      },
    });

    expect(data?.register).toBeDefined();
    expect(data?.register?.token).toBeDefined();

    const decoded = jwt.verify(data?.register?.token || '', getConfig().jwtSecret) as jwt.JwtPayload;

    expect(decoded).toBeDefined();
    expect(decoded).not.toBeNull();
    expect(decoded).toHaveProperty('id');
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
    expect(decoded).toHaveProperty('session');
  });

  it('should not register a user with an existing username', async () => {
    await createUser(email);

    const { errors } = await gcall<{ register: TokenResponse }>({
      source: registerMutation,
      variableValues: {
        input: { username: email, password },
      },
    });

    expect(errors?.[0].message).toEqual('User already exists');
  });

  it('should not register a user with a malformed email', async () => {
    const { errors } = await gcall<{ register: TokenResponse }>({
      source: registerMutation,
      variableValues: {
        input: { username: 'not an email', password },
      },
    });

    expect(errors?.[0].message).toEqual('Invalid username');
  });
});

describe('Test: login', () => {
  const email = faker.internet.email();

  beforeEach(async () => {
    await createUser(email);
  });

  it('should login a user', async () => {
    const { data } = await gcall<{ login: TokenResponse }>({
      source: loginMutation,
      variableValues: {
        input: { username: email, password: 'password' },
      },
    });

    const token = data?.login.token as string;

    expect(token).toBeDefined();

    const decoded = jwt.verify(token, getConfig().jwtSecret) as { id: string; session: string };

    const user = await User.findOne({ where: { username: email.toLowerCase().trim() } });

    expect(decoded.id).toBeDefined();
    expect(user?.id).toEqual(decoded.id);
  });

  it('should not login a user with an incorrect password', async () => {
    const { errors } = await gcall<{ login: TokenResponse }>({
      source: loginMutation,
      variableValues: {
        input: { username: email, password: 'wrong password' },
      },
    });

    expect(errors?.[0].message).toEqual('Wrong password');
  });

  it('should not login a user with a malformed email', async () => {
    const { errors } = await gcall<{ login: TokenResponse }>({
      source: loginMutation,
      variableValues: {
        input: { username: 'not an email', password: 'password' },
      },
    });

    expect(errors?.[0].message).toEqual('User not found');
  });
});

describe('Test: logout', () => {
  const email = faker.internet.email();
  let user1: User;

  beforeEach(async () => {
    user1 = await createUser(email);
  });

  it('should logout a user', async () => {
    const { data } = await gcall<{ logout: boolean }>({
      source: 'mutation { logout }',
      userId: user1.id,
      session: 'session',
    });

    expect(data?.logout).toBeTruthy();
  });
});

describe('Test: isConfigured', () => {
  it('should return false if no users exist', async () => {
    const { data } = await gcall<{ isConfigured: boolean }>({
      source: isConfiguredQuery,
    });

    expect(data?.isConfigured).toBeFalsy();
  });

  it('should return true if a user exists', async () => {
    await createUser(faker.internet.email());

    const { data } = await gcall<{ isConfigured: boolean }>({
      source: isConfiguredQuery,
    });

    expect(data?.isConfigured).toBeTruthy();
  });
});

describe('Test: refreshToken', () => {
  const email = faker.internet.email();
  let user1: User;

  beforeEach(async () => {
    user1 = await createUser(email);
  });

  it('should return a new token', async () => {
    // Arrange
    const session = faker.datatype.uuid();
    await TipiCache.set(session, user1.id.toString());

    // Act
    const { data } = await gcall<{ refreshToken: TokenResponse }>({
      source: refreshTokenQuery,
      userId: user1.id,
      session: session,
    });
    const decoded = jwt.verify(data?.refreshToken?.token || '', getConfig().jwtSecret) as jwt.JwtPayload;

    // Assert
    expect(data?.refreshToken).toBeDefined();
    expect(data?.refreshToken?.token).toBeDefined();
    expect(decoded).toBeDefined();
    expect(decoded).not.toBeNull();
    expect(decoded).toHaveProperty('id');
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
    expect(decoded).toHaveProperty('session');

    expect(decoded.id).toEqual(user1.id.toString());
    expect(decoded.session).not.toEqual(session);
  });
});
