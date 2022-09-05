import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';
import { setupConnection, teardownConnection } from '../../../test/connection';
import { gcall } from '../../../test/gcall';
import { loginMutation, registerMutation } from '../../../test/mutations';
import { isConfiguredQuery, MeQuery } from '../../../test/queries';
import User from '../../auth/user.entity';
import { UserResponse } from '../auth.types';
import { createUser } from './user.factory';

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
    const { data } = await gcall<{ register: UserResponse }>({
      source: registerMutation,
      variableValues: {
        input: { username: email, password },
      },
    });

    expect(data?.register.user?.username).toEqual(email.toLowerCase());
  });

  it('should not register a user with an existing username', async () => {
    await createUser(email);

    const { errors } = await gcall<{ register: UserResponse }>({
      source: registerMutation,
      variableValues: {
        input: { username: email, password },
      },
    });

    expect(errors?.[0].message).toEqual('User already exists');
  });

  it('should not register a user with a malformed email', async () => {
    const { errors } = await gcall<{ register: UserResponse }>({
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
    const { data } = await gcall<{ login: UserResponse }>({
      source: loginMutation,
      variableValues: {
        input: { username: email, password: 'password' },
      },
    });

    expect(data?.login.user?.username).toEqual(email.toLowerCase());
  });

  it('should not login a user with an incorrect password', async () => {
    const { errors } = await gcall<{ login: UserResponse }>({
      source: loginMutation,
      variableValues: {
        input: { username: email, password: 'wrong password' },
      },
    });

    expect(errors?.[0].message).toEqual('Wrong password');
  });

  it('should not login a user with a malformed email', async () => {
    const { errors } = await gcall<{ login: UserResponse }>({
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
