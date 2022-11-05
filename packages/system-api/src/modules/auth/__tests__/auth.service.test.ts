import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';
import AuthService from '../auth.service';
import { createUser } from './user.factory';
import User from '../user.entity';
import { setupConnection, teardownConnection } from '../../../test/connection';
import { setConfig } from '../../../core/config/TipiConfig';
import TipiCache from '../../../config/TipiCache';

let db: DataSource | null = null;
const TEST_SUITE = 'authservice';

jest.mock('redis');

beforeAll(async () => {
  setConfig('jwtSecret', 'test');
  db = await setupConnection(TEST_SUITE);
});

beforeEach(async () => {
  await User.clear();
});

afterAll(async () => {
  await db?.destroy();
  await teardownConnection(TEST_SUITE);
});

describe('Login', () => {
  it('Should return a valid jsonwebtoken containing a user id', async () => {
    // Arrange
    const email = faker.internet.email();
    const user = await createUser(email);

    // Act
    const { token } = await AuthService.login({ username: email, password: 'password' });
    const decoded = jwt.verify(token, 'test') as jwt.JwtPayload;

    // Assert
    expect(decoded).toBeDefined();
    expect(decoded).toBeDefined();
    expect(decoded).not.toBeNull();
    expect(decoded).toHaveProperty('id');
    expect(decoded.id).toBe(user.id);
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
    expect(decoded).toHaveProperty('session');
  });

  it('Should throw if user does not exist', async () => {
    await expect(AuthService.login({ username: 'test', password: 'test' })).rejects.toThrowError('User not found');
  });

  it('Should throw if password is incorrect', async () => {
    const email = faker.internet.email();
    await createUser(email);
    await expect(AuthService.login({ username: email, password: 'wrong' })).rejects.toThrowError('Wrong password');
  });
});

describe('Register', () => {
  it('Should return valid jsonwebtoken after register', async () => {
    // Arrange
    const email = faker.internet.email();

    // Act
    const { token } = await AuthService.register({ username: email, password: 'password' });
    const decoded = jwt.verify(token, 'test') as jwt.JwtPayload;

    // Assert
    expect(decoded).toBeDefined();
    expect(decoded).not.toBeNull();
    expect(decoded).toHaveProperty('id');
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
    expect(decoded).toHaveProperty('session');
  });

  it('Should correctly trim and lowercase email', async () => {
    // Arrange
    const email = faker.internet.email();

    // Act
    await AuthService.register({ username: email, password: 'test' });
    const user = await User.findOne({ where: { username: email.toLowerCase().trim() } });

    // Assert
    expect(user).toBeDefined();
    expect(user?.username).toBe(email.toLowerCase().trim());
  });

  it('Should throw if user already exists', async () => {
    // Arrange
    const email = faker.internet.email();

    // Act & Assert
    await createUser(email);
    await expect(AuthService.register({ username: email, password: 'test' })).rejects.toThrowError('User already exists');
  });

  it('Should throw if email is not provided', async () => {
    await expect(AuthService.register({ username: '', password: 'test' })).rejects.toThrowError('Missing email or password');
  });

  it('Should throw if password is not provided', async () => {
    await expect(AuthService.register({ username: faker.internet.email(), password: '' })).rejects.toThrowError('Missing email or password');
  });

  it('Password is correctly hashed', async () => {
    // Arrange
    const email = faker.internet.email().toLowerCase().trim();

    // Act
    await AuthService.register({ username: email, password: 'test' });
    const user = await User.findOne({ where: { username: email } });
    const isPasswordValid = await argon2.verify(user?.password || '', 'test');

    // Assert
    expect(isPasswordValid).toBe(true);
  });

  it('Should throw if email is invalid', async () => {
    await expect(AuthService.register({ username: 'test', password: 'test' })).rejects.toThrowError('Invalid username');
  });
});

describe('Test: logout', () => {
  it('Should return true if there is no session to delete', async () => {
    // Act
    // @ts-ignore
    const result = await AuthService.logout();

    // Assert
    expect(result).toBe(true);
  });

  it('Should delete session from cache', async () => {
    // Arrange
    const session = faker.random.alphaNumeric(32);
    await TipiCache.set(session, 'test');
    expect(await TipiCache.get(session)).toBe('test');

    // Act
    const result = await AuthService.logout(session);

    // Assert
    expect(result).toBe(true);
    expect(await TipiCache.get('session')).toBeUndefined();
  });
});

describe('Test: refreshToken', () => {
  it('Should return null if session is not provided', async () => {
    // Act
    const result = await AuthService.refreshToken();

    // Assert
    expect(result).toBeNull();
  });

  it('Should return null if session is not found in cache', async () => {
    // Act
    const result = await AuthService.refreshToken('test');

    // Assert
    expect(result).toBeNull();
  });

  it('Should return a new token if session is found in cache', async () => {
    // Arrange
    const session = faker.random.alphaNumeric(32);
    await TipiCache.set(session, 'test');

    // Act
    const result = await AuthService.refreshToken(session);

    // Assert
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('token');
    expect(result?.token).not.toBe(session);
  });

  it('Should put expiration in 6 seconds for old session', async () => {
    // Arrange
    const session = faker.random.alphaNumeric(32);
    await TipiCache.set(session, '1');

    // Act
    const result = await AuthService.refreshToken(session);
    const expiration = await TipiCache.ttl(session);

    // Assert
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('token');
    expect(result?.token).not.toBe(session);
    expect(expiration).toMatchObject({ EX: 6 });
  });
});

describe('Test: me', () => {
  it('Should return null if userId is not provided', async () => {
    // Act
    const result = await AuthService.me();

    // Assert
    expect(result).toBeNull();
  });

  it('Should return null if user does not exist', async () => {
    // Act
    const result = await AuthService.me(1);

    // Assert
    expect(result).toBeNull();
  });

  it('Should return user if user exists', async () => {
    // Arrange
    const email = faker.internet.email();
    const user = await createUser(email);

    // Act
    const result = await AuthService.me(user.id);

    // Assert
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('username');
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');
  });
});
