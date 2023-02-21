import { PrismaClient } from '@prisma/client';
import fs from 'fs-extra';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { faker } from '@faker-js/faker';
import { setConfig } from '../../core/TipiConfig';
import { createUser } from '../../tests/user.factory';
import { AuthServiceClass } from './auth.service';
import TipiCache from '../../core/TipiCache';
import { getTestDbClient } from '../../../../tests/server/db-connection';

let db: PrismaClient;
let AuthService: AuthServiceClass;
const TEST_SUITE = 'authservice';

beforeAll(async () => {
  setConfig('jwtSecret', 'test');
  db = await getTestDbClient(TEST_SUITE);
  AuthService = new AuthServiceClass(db);
});

beforeEach(async () => {
  jest.mock('fs-extra');
  jest.mock('redis');
  await db.user.deleteMany();
});

afterAll(async () => {
  await db.user.deleteMany();
  await db.$disconnect();
});

describe('Login', () => {
  it('Should return a valid jsonwebtoken containing a user id', async () => {
    // Arrange
    const email = faker.internet.email();
    const user = await createUser({ email }, db);

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
    await createUser({ email }, db);
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
    const user = await db.user.findFirst({ where: { username: email.toLowerCase().trim() } });

    // Assert
    expect(user).toBeDefined();
    expect(user?.username).toBe(email.toLowerCase().trim());
  });

  it('should throw if there is already an operator', async () => {
    // Arrange
    const email = faker.internet.email();

    // Act & Assert
    await createUser({ email, operator: true }, db);
    await expect(AuthService.register({ username: email, password: 'test' })).rejects.toThrowError('There is already an admin user. Please login to create a new user from the admin panel.');
  });

  it('Should throw if user already exists', async () => {
    // Arrange
    const email = faker.internet.email();

    // Act & Assert
    await createUser({ email, operator: false }, db);
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
    const user = await db.user.findUnique({ where: { username: email } });
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
    const result = await AuthServiceClass.logout();

    // Assert
    expect(result).toBe(true);
  });

  it('Should delete session from cache', async () => {
    // Arrange
    const session = faker.random.alphaNumeric(32);
    await TipiCache.set(session, 'test');
    expect(await TipiCache.get(session)).toBe('test');

    // Act
    const result = await AuthServiceClass.logout(session);

    // Assert
    expect(result).toBe(true);
    expect(await TipiCache.get('session')).toBeUndefined();
  });
});

describe('Test: refreshToken', () => {
  it('Should return null if session is not provided', async () => {
    // Act
    const result = await AuthServiceClass.refreshToken();

    // Assert
    expect(result).toBeNull();
  });

  it('Should return null if session is not found in cache', async () => {
    // Act
    const result = await AuthServiceClass.refreshToken('test');

    // Assert
    expect(result).toBeNull();
  });

  it('Should return a new token if session is found in cache', async () => {
    // Arrange
    const session = faker.random.alphaNumeric(32);
    await TipiCache.set(session, 'test');

    // Act
    const result = await AuthServiceClass.refreshToken(session);

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
    const result = await AuthServiceClass.refreshToken(session);
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
    // @ts-expect-error - ctx is missing session
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
    const user = await createUser({ email }, db);

    // Act
    const result = await AuthService.me(user.id);

    // Assert
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('username');
  });
});

describe('Test: isConfigured', () => {
  it('Should return false if no user exists', async () => {
    // Act
    const result = await AuthService.isConfigured();

    // Assert
    expect(result).toBe(false);
  });

  it('Should return true if user exists', async () => {
    // Arrange
    const email = faker.internet.email();
    await createUser({ email }, db);

    // Act
    const result = await AuthService.isConfigured();

    // Assert
    expect(result).toBe(true);
  });
});

describe('Test: changePassword', () => {
  it('should change the password of the operator user', async () => {
    // Arrange
    const email = faker.internet.email();
    const user = await createUser({ email }, db);
    const newPassword = faker.internet.password();
    // @ts-expect-error - mocking fs
    fs.__createMockFiles({ '/runtipi/state/password-change-request': '' });

    // Act
    const result = await AuthService.changePassword({ newPassword });

    // Assert
    expect(result.email).toBe(email.toLowerCase());
    const updatedUser = await db.user.findUnique({ where: { id: user.id } });
    expect(updatedUser?.password).not.toBe(user.password);
  });

  it('should throw if the password change request file does not exist', async () => {
    // Arrange
    const email = faker.internet.email();
    await createUser({ email }, db);
    const newPassword = faker.internet.password();
    // @ts-expect-error - mocking fs
    fs.__createMockFiles({});

    // Act & Assert
    await expect(AuthService.changePassword({ newPassword })).rejects.toThrowError('No password change request found');
  });

  it('should throw if there is no operator user', async () => {
    // Arrange
    const email = faker.internet.email();
    await createUser({ email, operator: false }, db);
    const newPassword = faker.internet.password();
    // @ts-expect-error - mocking fs
    fs.__createMockFiles({ '/runtipi/state/password-change-request': '' });

    // Act & Assert
    await expect(AuthService.changePassword({ newPassword })).rejects.toThrowError('Operator user not found');
  });
});

describe('Test: checkPasswordChangeRequest', () => {
  it('should return true if the password change request file exists', async () => {
    // Arrange
    // @ts-expect-error - mocking fs
    fs.__createMockFiles({ '/runtipi/state/password-change-request': '' });

    // Act
    const result = await AuthServiceClass.checkPasswordChangeRequest();

    // Assert
    expect(result).toBe(true);
  });

  it('should return false if the password change request file does not exist', async () => {
    // Arrange
    // @ts-expect-error - mocking fs
    fs.__createMockFiles({});

    // Act
    const result = await AuthServiceClass.checkPasswordChangeRequest();

    // Assert
    expect(result).toBe(false);
  });
});

describe('Test: cancelPasswordChangeRequest', () => {
  it('should delete the password change request file', async () => {
    // Arrange
    // @ts-expect-error - mocking fs
    fs.__createMockFiles({ '/runtipi/state/password-change-request': '' });

    // Act
    await AuthServiceClass.cancelPasswordChangeRequest();

    // Assert
    expect(fs.existsSync('/runtipi/state/password-change-request')).toBe(false);
  });
});
