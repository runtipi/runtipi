import fs from 'fs-extra';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { faker } from '@faker-js/faker';
import { TotpAuthenticator } from '@/server/utils/totp';
import { generateSessionId } from '@/server/common/get-server-auth-session';
import { fromAny } from '@total-typescript/shoehorn';
import { mockInsert, mockSelect } from '@/server/tests/drizzle-helpers';
import { createDatabase, clearDatabase, closeDatabase, TestDatabase } from '@/server/tests/test-utils';
import { encrypt } from '../../utils/encryption';
import { setConfig } from '../../core/TipiConfig';
import { createUser, getUserByEmail, getUserById } from '../../tests/user.factory';
import { AuthServiceClass } from './auth.service';
import TipiCache from '../../core/TipiCache';

let AuthService: AuthServiceClass;
let database: TestDatabase;
const TEST_SUITE = 'authservice';

beforeAll(async () => {
  setConfig('jwtSecret', 'test');
  database = await createDatabase(TEST_SUITE);
  AuthService = new AuthServiceClass(database.db);
});

beforeEach(async () => {
  jest.mock('fs-extra');
  jest.mock('redis');
  await setConfig('demoMode', false);
  await clearDatabase(database);
});

afterAll(async () => {
  await closeDatabase(database);
});

describe('Login', () => {
  it('Should return a valid jsonwebtoken containing a user id', async () => {
    // Arrange
    const email = faker.internet.email();
    const user = await createUser({ email }, database);

    // Act
    const { token } = await AuthService.login({ username: email, password: 'password' });
    const decoded = jwt.verify(token as string, 'test') as jwt.JwtPayload;

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
    await createUser({ email }, database);
    await expect(AuthService.login({ username: email, password: 'wrong' })).rejects.toThrowError('Wrong password');
  });

  // TOTP
  it('should return a totp session id the user totpEnabled is true', async () => {
    // arrange
    const email = faker.internet.email();
    const totpSecret = TotpAuthenticator.generateSecret();
    await createUser({ email, totpEnabled: true, totpSecret }, database);

    // act
    const { totpSessionId, token } = await AuthService.login({ username: email, password: 'password' });

    // assert
    expect(totpSessionId).toBeDefined();
    expect(totpSessionId).not.toBeNull();
    expect(token).toBeUndefined();
  });
});

describe('Test: verifyTotp', () => {
  it('should return a valid jsonwebtoken if the totp is correct', async () => {
    // arrange
    const email = faker.internet.email();
    const salt = faker.random.word();
    const totpSecret = TotpAuthenticator.generateSecret();

    const encryptedTotpSecret = encrypt(totpSecret, salt);
    const user = await createUser({ email, totpEnabled: true, totpSecret: encryptedTotpSecret, salt }, database);
    const totpSessionId = generateSessionId('otp');
    const otp = TotpAuthenticator.generate(totpSecret);

    await TipiCache.set(totpSessionId, user.id.toString());

    // act
    const { token } = await AuthService.verifyTotp({ totpSessionId, totpCode: otp });

    // assert
    expect(token).toBeDefined();
    expect(token).not.toBeNull();
  });

  it('should throw if the totp is incorrect', async () => {
    // arrange
    const email = faker.internet.email();
    const salt = faker.random.word();
    const totpSecret = TotpAuthenticator.generateSecret();
    const encryptedTotpSecret = encrypt(totpSecret, salt);
    const user = await createUser({ email, totpEnabled: true, totpSecret: encryptedTotpSecret, salt }, database);
    const totpSessionId = generateSessionId('otp');
    await TipiCache.set(totpSessionId, user.id.toString());

    // act & assert
    await expect(AuthService.verifyTotp({ totpSessionId, totpCode: 'wrong' })).rejects.toThrowError('Invalid TOTP');
  });

  it('should throw if the totpSessionId is invalid', async () => {
    // arrange
    const email = faker.internet.email();
    const salt = faker.random.word();
    const totpSecret = TotpAuthenticator.generateSecret();
    const encryptedTotpSecret = encrypt(totpSecret, salt);
    const user = await createUser({ email, totpEnabled: true, totpSecret: encryptedTotpSecret, salt }, database);
    const totpSessionId = generateSessionId('otp');
    const otp = TotpAuthenticator.generate(totpSecret);

    await TipiCache.set(totpSessionId, user.id.toString());

    // act & assert
    await expect(AuthService.verifyTotp({ totpSessionId: 'wrong', totpCode: otp })).rejects.toThrowError('TOTP session not found');
  });

  it('should throw if the user does not exist', async () => {
    // arrange
    const totpSessionId = generateSessionId('otp');
    await TipiCache.set(totpSessionId, '1234');

    // act & assert
    await expect(AuthService.verifyTotp({ totpSessionId, totpCode: '1234' })).rejects.toThrowError('User not found');
  });

  it('should throw if the user totpEnabled is false', async () => {
    // arrange
    const email = faker.internet.email();
    const salt = faker.random.word();
    const totpSecret = TotpAuthenticator.generateSecret();
    const encryptedTotpSecret = encrypt(totpSecret, salt);
    const user = await createUser({ email, totpEnabled: false, totpSecret: encryptedTotpSecret, salt }, database);
    const totpSessionId = generateSessionId('otp');
    const otp = TotpAuthenticator.generate(totpSecret);

    await TipiCache.set(totpSessionId, user.id.toString());

    // act & assert
    await expect(AuthService.verifyTotp({ totpSessionId, totpCode: otp })).rejects.toThrowError('TOTP is not enabled for this user');
  });
});

describe('Test: getTotpUri', () => {
  it('should return a valid totp uri', async () => {
    // arrange
    const email = faker.internet.email();
    const user = await createUser({ email }, database);

    // act
    const { uri, key } = await AuthService.getTotpUri({ userId: user.id, password: 'password' });

    // assert
    expect(uri).toBeDefined();
    expect(uri).not.toBeNull();
    expect(key).toBeDefined();
    expect(key).not.toBeNull();
    expect(uri).toContain(key);
  });

  it('should create a new totp secret if the user does not have one', async () => {
    // arrange
    const email = faker.internet.email();
    const user = await createUser({ email }, database);

    // act
    await AuthService.getTotpUri({ userId: user.id, password: 'password' });
    const userFromDb = await getUserById(user.id, database);

    // assert
    expect(userFromDb).toBeDefined();
    expect(userFromDb).not.toBeNull();
    expect(userFromDb).toHaveProperty('totpSecret');
    expect(userFromDb).toHaveProperty('salt');
  });

  it('should regenerate a new totp secret if the user already has one', async () => {
    // arrange
    const email = faker.internet.email();
    const salt = faker.random.word();
    const totpSecret = TotpAuthenticator.generateSecret();
    const encryptedTotpSecret = encrypt(totpSecret, salt);
    const user = await createUser({ email, totpSecret: encryptedTotpSecret, salt }, database);

    // act
    await AuthService.getTotpUri({ userId: user.id, password: 'password' });
    const userFromDb = await getUserById(user.id, database);

    // assert
    expect(userFromDb).toBeDefined();
    expect(userFromDb).not.toBeNull();
    expect(userFromDb).toHaveProperty('totpSecret');
    expect(userFromDb).toHaveProperty('salt');
    expect(userFromDb?.totpSecret).not.toEqual(encryptedTotpSecret);
    expect(userFromDb?.salt).toEqual(salt);
  });

  it('should thorw an error if user has already configured totp', async () => {
    // arrange
    const email = faker.internet.email();
    const user = await createUser({ email, totpEnabled: true }, database);

    // act & assert
    await expect(AuthService.getTotpUri({ userId: user.id, password: 'password' })).rejects.toThrowError('TOTP is already enabled for this user');
  });

  it('should throw an error if the user password is incorrect', async () => {
    // arrange
    const email = faker.internet.email();
    const user = await createUser({ email }, database);

    // act & assert
    await expect(AuthService.getTotpUri({ userId: user.id, password: 'wrong' })).rejects.toThrowError('Invalid password');
  });

  it('should throw an error if the user does not exist', async () => {
    // arrange
    const userId = 11;

    // act & assert
    await expect(AuthService.getTotpUri({ userId, password: 'password' })).rejects.toThrowError('User not found');
  });

  it('should throw an error if app is in demo mode', async () => {
    // arrange
    await setConfig('demoMode', true);
    const email = faker.internet.email();
    const user = await createUser({ email }, database);

    // act & assert
    await expect(AuthService.getTotpUri({ userId: user.id, password: 'password' })).rejects.toThrowError('2FA is not available in demo mode');
  });
});

describe('Test: setupTotp', () => {
  it('should enable totp for the user', async () => {
    // arrange
    const email = faker.internet.email();
    const totpSecret = TotpAuthenticator.generateSecret();
    const salt = faker.random.word();
    const encryptedTotpSecret = encrypt(totpSecret, salt);

    const user = await createUser({ email, totpSecret: encryptedTotpSecret, salt }, database);
    const otp = TotpAuthenticator.generate(totpSecret);

    // act
    await AuthService.setupTotp({ userId: user.id, totpCode: otp });
    const userFromDb = await getUserById(user.id, database);

    // assert
    expect(userFromDb).toBeDefined();
    expect(userFromDb).not.toBeNull();
    expect(userFromDb).toHaveProperty('totpEnabled');
    expect(userFromDb?.totpEnabled).toBeTruthy();
  });

  it('should throw if the user has already enabled totp', async () => {
    // arrange
    const email = faker.internet.email();
    const user = await createUser({ email, totpEnabled: true }, database);

    // act & assert
    await expect(AuthService.setupTotp({ userId: user.id, totpCode: '1234' })).rejects.toThrowError('TOTP is already enabled for this user');
  });

  it('should throw if the user does not exist', async () => {
    // arrange
    const userId = 11;

    // act & assert
    await expect(AuthService.setupTotp({ userId, totpCode: '1234' })).rejects.toThrowError('User not found');
  });

  it('should throw if the otp is invalid', async () => {
    // arrange
    const email = faker.internet.email();
    const totpSecret = TotpAuthenticator.generateSecret();
    const salt = faker.random.word();
    const encryptedTotpSecret = encrypt(totpSecret, salt);

    const user = await createUser({ email, totpSecret: encryptedTotpSecret, salt }, database);

    // act & assert
    await expect(AuthService.setupTotp({ userId: user.id, totpCode: '1234' })).rejects.toThrowError('Invalid TOTP code');
  });

  it('should throw an error if app is in demo mode', async () => {
    // arrange
    await setConfig('demoMode', true);
    const email = faker.internet.email();
    const user = await createUser({ email }, database);

    // act & assert
    await expect(AuthService.setupTotp({ userId: user.id, totpCode: '1234' })).rejects.toThrowError('2FA is not available in demo mode');
  });
});

describe('Test: disableTotp', () => {
  it('should disable totp for the user', async () => {
    // arrange
    const email = faker.internet.email();
    const user = await createUser({ email, totpEnabled: true }, database);

    // act
    await AuthService.disableTotp({ userId: user.id, password: 'password' });
    const userFromDb = await getUserById(user.id, database);

    // assert
    expect(userFromDb).toBeDefined();
    expect(userFromDb).not.toBeNull();
    expect(userFromDb).toHaveProperty('totpEnabled');
    expect(userFromDb?.totpEnabled).toBeFalsy();
  });

  it('should throw if the user has already disabled totp', async () => {
    // arrange
    const email = faker.internet.email();
    const user = await createUser({ email, totpEnabled: false }, database);

    // act & assert
    await expect(AuthService.disableTotp({ userId: user.id, password: 'password' })).rejects.toThrowError('TOTP is not enabled for this user');
  });

  it('should throw if the user does not exist', async () => {
    // arrange
    const userId = 11;

    // act & assert
    await expect(AuthService.disableTotp({ userId, password: 'password' })).rejects.toThrowError('User not found');
  });

  it('should throw if the password is invalid', async () => {
    // arrange
    const email = faker.internet.email();
    const user = await createUser({ email, totpEnabled: true }, database);

    // act & assert
    await expect(AuthService.disableTotp({ userId: user.id, password: 'wrong' })).rejects.toThrowError('Invalid password');
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
    const user = await getUserByEmail(email.toLowerCase().trim(), database);

    // Assert
    expect(user).toBeDefined();
    expect(user?.username).toBe(email.toLowerCase().trim());
  });

  it('should throw if there is already an operator', async () => {
    // Arrange
    const email = faker.internet.email();

    // Act & Assert
    await createUser({ email, operator: true }, database);
    await expect(AuthService.register({ username: email, password: 'test' })).rejects.toThrowError('There is already an admin user. Please login to create a new user from the admin panel.');
  });

  it('Should throw if user already exists', async () => {
    // Arrange
    const email = faker.internet.email();

    // Act & Assert
    await createUser({ email, operator: false }, database);
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
    const user = await getUserByEmail(email, database);
    const isPasswordValid = await argon2.verify(user?.password || '', 'test');

    // Assert
    expect(isPasswordValid).toBe(true);
  });

  it('Should throw if email is invalid', async () => {
    await expect(AuthService.register({ username: 'test', password: 'test' })).rejects.toThrowError('Invalid username');
  });

  it('should throw if db fails to insert user', async () => {
    // Arrange
    const email = faker.internet.email();
    const mockDatabase = { select: mockSelect([]), insert: mockInsert([]) };
    const newAuthService = new AuthServiceClass(fromAny(mockDatabase));

    // Act & Assert
    await expect(newAuthService.register({ username: email, password: 'test' })).rejects.toThrowError('Error creating user');
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
    const user = await createUser({ email }, database);

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
    await createUser({ email }, database);

    // Act
    const result = await AuthService.isConfigured();

    // Assert
    expect(result).toBe(true);
  });
});

describe('Test: changeOperatorPassword', () => {
  it('should change the password of the operator user', async () => {
    // Arrange
    const email = faker.internet.email();
    const user = await createUser({ email }, database);
    const newPassword = faker.internet.password();
    // @ts-expect-error - mocking fs
    fs.__createMockFiles({ '/runtipi/state/password-change-request': '' });

    // Act
    const result = await AuthService.changeOperatorPassword({ newPassword });

    // Assert
    expect(result.email).toBe(email.toLowerCase());
    const updatedUser = await getUserById(user.id, database);
    expect(updatedUser?.password).not.toBe(user.password);
  });

  it('should throw if the password change request file does not exist', async () => {
    // Arrange
    const email = faker.internet.email();
    await createUser({ email }, database);
    const newPassword = faker.internet.password();
    // @ts-expect-error - mocking fs
    fs.__createMockFiles({});

    // Act & Assert
    await expect(AuthService.changeOperatorPassword({ newPassword })).rejects.toThrowError('No password change request found');
  });

  it('should throw if there is no operator user', async () => {
    // Arrange
    const email = faker.internet.email();
    await createUser({ email, operator: false }, database);
    const newPassword = faker.internet.password();
    // @ts-expect-error - mocking fs
    fs.__createMockFiles({ '/runtipi/state/password-change-request': '' });

    // Act & Assert
    await expect(AuthService.changeOperatorPassword({ newPassword })).rejects.toThrowError('Operator user not found');
  });

  it('should reset totpSecret and totpEnabled if totp is enabled', async () => {
    // Arrange
    const email = faker.internet.email();
    const user = await createUser({ email, totpEnabled: true }, database);
    const newPassword = faker.internet.password();
    // @ts-expect-error - mocking fs
    fs.__createMockFiles({ '/runtipi/state/password-change-request': '' });

    // Act
    const result = await AuthService.changeOperatorPassword({ newPassword });

    // Assert
    expect(result.email).toBe(email.toLowerCase());
    const updatedUser = await getUserById(user.id, database);
    expect(updatedUser?.password).not.toBe(user.password);
    expect(updatedUser?.totpEnabled).toBe(false);
    expect(updatedUser?.totpSecret).toBeNull();
  });
});

describe('Test: checkPasswordChangeRequest', () => {
  it('should return true if the password change request file exists', async () => {
    // Arrange
    // @ts-expect-error - mocking fs
    fs.__createMockFiles({ '/runtipi/state/password-change-request': '' });

    // Act
    const result = AuthServiceClass.checkPasswordChangeRequest();

    // Assert
    expect(result).toBe(true);
  });

  it('should return false if the password change request file does not exist', async () => {
    // Arrange
    // @ts-expect-error - mocking fs
    fs.__createMockFiles({});

    // Act
    const result = AuthServiceClass.checkPasswordChangeRequest();

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

describe('Test: changePassword', () => {
  it('should change the password of the user', async () => {
    // arrange
    const email = faker.internet.email();
    const user = await createUser({ email }, database);
    const newPassword = faker.internet.password();

    // act
    await AuthService.changePassword({ userId: user.id, newPassword, currentPassword: 'password' });

    // assert
    const updatedUser = await getUserById(user.id, database);
    expect(updatedUser?.password).not.toBe(user.password);
  });

  it('should throw if the user does not exist', async () => {
    // arrange
    const newPassword = faker.internet.password();

    // act & assert
    await expect(AuthService.changePassword({ userId: 1, newPassword, currentPassword: 'password' })).rejects.toThrowError('User not found');
  });

  it('should throw if the password is incorrect', async () => {
    // arrange
    const email = faker.internet.email();
    const user = await createUser({ email }, database);
    const newPassword = faker.internet.password();

    // act & assert
    await expect(AuthService.changePassword({ userId: user.id, newPassword, currentPassword: 'wrongpassword' })).rejects.toThrowError('Current password is invalid');
  });

  it('should throw if password is less than 8 characters', async () => {
    // arrange
    const email = faker.internet.email();
    const user = await createUser({ email }, database);
    const newPassword = faker.internet.password(7);

    // act & assert
    await expect(AuthService.changePassword({ userId: user.id, newPassword, currentPassword: 'password' })).rejects.toThrowError('Password must be at least 8 characters');
  });

  it('should throw if instance is in demo mode', async () => {
    // arrange
    await setConfig('demoMode', true);
    const email = faker.internet.email();
    const user = await createUser({ email }, database);
    const newPassword = faker.internet.password();

    // act & assert
    await expect(AuthService.changePassword({ userId: user.id, newPassword, currentPassword: 'password' })).rejects.toThrowError('Changing password is not allowed in demo mode');
  });
});
