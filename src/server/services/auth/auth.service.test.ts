import path from 'node:path';
import { DATA_DIR } from '@/config/constants';
import type { ISessionManager } from '@/server/common/session-manager';
import type { IAuthQueries } from '@/server/queries/auth/auth.queries';
import { TotpAuthenticator } from '@/server/utils/totp';
import { faker } from '@faker-js/faker';
import type { ICache } from '@runtipi/cache';
import { CacheMock } from '@runtipi/cache/src/mock';
import type { User } from '@runtipi/db';
import * as argon2 from 'argon2';
import fs from 'fs-extra';
import { Container } from 'inversify';
import { cookies } from 'next/headers';
import { v4 } from 'uuid';
import { beforeEach, describe, expect, it } from 'vitest';
import { TipiConfig } from '../../core/TipiConfig';
import { createUser } from '../../tests/user.factory';
import { encrypt } from '../../utils/encryption';
import { AuthService, type IAuthService } from './auth.service';
import { mock, anyString, mockReset, anyObject } from 'vitest-mock-extended';

describe('AuthService', () => {
  // Prepare the mocks
  const mockQueries = mock<IAuthQueries>();
  const mockSessionManager = mock<ISessionManager>();
  const mockCache = new CacheMock();

  // Prepare the container
  const container = new Container();
  container.bind<IAuthQueries>('IAuthQueries').toConstantValue(mockQueries);
  container.bind<ICache>('ICache').toConstantValue(mockCache);
  container.bind<ISessionManager>('ISessionManager').toConstantValue(mockSessionManager);
  container.bind<IAuthService>('IAuthService').to(AuthService);

  // Get the service
  const authService = container.get<IAuthService>('IAuthService');
  const cookieStore = cookies();

  beforeEach(async () => {
    await TipiConfig.setConfig('demoMode', false);
    mockReset(mockQueries);
    mockReset(mockSessionManager);
  });

  describe('Login', () => {
    it('should return a new session id', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email });

      mockQueries.getUserByUsername.calledWith(email).mockResolvedValue(user);

      // act
      const { sessionId } = await authService.login({ username: email, password: 'password' });

      // assert
      expect(sessionId).toBeDefined();
      expect(sessionId).not.toBeNull();
    });

    it('should throw if user does not exist', async () => {
      // act & assert
      await expect(authService.login({ username: 'test', password: 'test' })).rejects.toThrowError('AUTH_ERROR_USER_NOT_FOUND');
    });

    it('should throw if password is incorrect', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email });
      mockQueries.getUserByUsername.calledWith(email).mockResolvedValue(user);

      await expect(authService.login({ username: email, password: 'wrong' })).rejects.toThrowError('AUTH_ERROR_INVALID_CREDENTIALS');
    });

    // TOTP
    it('should return a totp session if the user totpEnabled is true', async () => {
      // arrange
      const email = faker.internet.email();
      const totpSecret = TotpAuthenticator.generateSecret();
      const user = await createUser({ email, totpEnabled: true, totpSecret });

      mockQueries.getUserByUsername.calledWith(email).mockResolvedValue(user);
      mockSessionManager.generateSessionId.calledWith(anyString()).mockReturnValue('otp-session');

      // act
      const { totpSessionId } = await authService.login({ username: email, password: 'password' });

      // assert
      expect(totpSessionId).toBeDefined();
      expect(totpSessionId).toBe('otp-session');
    });
  });

  describe('Test: verifyTotp', () => {
    it('should correctly log in user after totp is verified', async () => {
      // arrange
      const email = faker.internet.email();
      const salt = faker.lorem.word();
      const totpSecret = TotpAuthenticator.generateSecret();

      const encryptedTotpSecret = encrypt(totpSecret, salt);
      const user = await createUser({ email, totpEnabled: true, totpSecret: encryptedTotpSecret, salt });

      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);
      const otp = TotpAuthenticator.generate(totpSecret);

      await mockCache.set('session-id', user.id.toString());

      // act
      const res = await authService.verifyTotp({ totpSessionId: 'session-id', totpCode: otp });

      // assert
      expect(res).toBe(true);
    });

    it('should throw if the totp is incorrect', async () => {
      // arrange
      const email = faker.internet.email();
      const salt = faker.lorem.word();
      const totpSecret = TotpAuthenticator.generateSecret();
      const encryptedTotpSecret = encrypt(totpSecret, salt);
      const user = await createUser({ email, totpEnabled: true, totpSecret: encryptedTotpSecret, salt });
      await mockCache.set('session-id', user.id.toString());

      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);

      // act & assert
      await expect(authService.verifyTotp({ totpSessionId: 'session-id', totpCode: 'wrong' })).rejects.toThrowError('AUTH_ERROR_TOTP_INVALID_CODE');
    });

    it('should throw if the totpSessionId is invalid', async () => {
      // arrange
      const email = faker.internet.email();
      const salt = faker.lorem.word();
      const totpSecret = TotpAuthenticator.generateSecret();
      const encryptedTotpSecret = encrypt(totpSecret, salt);
      const user = await createUser({ email, totpEnabled: true, totpSecret: encryptedTotpSecret, salt });

      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);

      const totpSessionId = 'session-id';
      const otp = TotpAuthenticator.generate(totpSecret);

      await mockCache.set(totpSessionId, user.id.toString());

      // act & assert
      await expect(authService.verifyTotp({ totpSessionId: 'wrong', totpCode: otp })).rejects.toThrowError('AUTH_ERROR_TOTP_SESSION_NOT_FOUND');
    });

    it('should throw if the user does not exist', async () => {
      // arrange
      await mockCache.set('session-id', '1234');

      // act & assert
      await expect(authService.verifyTotp({ totpSessionId: 'session-id', totpCode: '1234' })).rejects.toThrowError('AUTH_ERROR_USER_NOT_FOUND');
    });

    it('should throw if the user totpEnabled is false', async () => {
      // arrange
      const email = faker.internet.email();
      const salt = faker.lorem.word();
      const totpSecret = TotpAuthenticator.generateSecret();
      const encryptedTotpSecret = encrypt(totpSecret, salt);
      const user = await createUser({ email, totpEnabled: false, totpSecret: encryptedTotpSecret, salt });
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);
      const totpSessionId = 'session-id';
      const otp = TotpAuthenticator.generate(totpSecret);

      await mockCache.set(totpSessionId, user.id.toString());

      // act & assert
      await expect(authService.verifyTotp({ totpSessionId, totpCode: otp })).rejects.toThrowError('AUTH_ERROR_TOTP_NOT_ENABLED');
    });
  });

  describe('Test: getTotpUri', () => {
    it('should return a valid totp uri', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email });
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);
      mockSessionManager.generateSessionId.calledWith(anyString()).mockReturnValue('session-id');

      // act
      const { uri, key } = await authService.getTotpUri({ userId: user.id, password: 'password' });

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
      const user = await createUser({ email, totpSecret: null, salt: 'smthg' });
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);
      mockQueries.updateUser.calledWith(user.id, anyObject()).mockImplementation(async (_, data) => {
        user.totpSecret = data.totpSecret as string;
        user.salt = data.salt as string;
        return user;
      });

      // act
      await authService.getTotpUri({ userId: user.id, password: 'password' });

      // assert
      expect(user).toHaveProperty('totpSecret');
      expect(user).toHaveProperty('salt');
    });

    it('should regenerate a new totp secret if the user already has one', async () => {
      // arrange
      const email = faker.internet.email();
      const salt = faker.lorem.word();
      const totpSecret = TotpAuthenticator.generateSecret();
      const encryptedTotpSecret = encrypt(totpSecret, salt);
      const user = await createUser({ email, totpSecret: encryptedTotpSecret, salt });
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);
      mockQueries.updateUser.calledWith(user.id, anyObject()).mockImplementation(async (_, data) => {
        user.totpSecret = data.totpSecret as string;
        user.salt = data.salt as string;
        return user;
      });

      // act
      await authService.getTotpUri({ userId: user.id, password: 'password' });

      // assert
      expect(user).toHaveProperty('totpSecret');
      expect(user).toHaveProperty('salt');
      expect(user.totpSecret).not.toEqual(encryptedTotpSecret);
      expect(user.salt).toEqual(salt);
    });

    it('should throw an error if user has already configured totp', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email, totpEnabled: true });
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);

      // act & assert
      await expect(authService.getTotpUri({ userId: user.id, password: 'password' })).rejects.toThrowError('AUTH_ERROR_TOTP_ALREADY_ENABLED');
    });

    it('should throw an error if the user password is incorrect', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email });
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);

      // act & assert
      await expect(authService.getTotpUri({ userId: user.id, password: 'wrong' })).rejects.toThrowError('AUTH_ERROR_INVALID_PASSWORD');
    });

    it('should throw an error if the user does not exist', async () => {
      // arrange
      const userId = 11;

      // act & assert
      await expect(authService.getTotpUri({ userId, password: 'password' })).rejects.toThrowError('AUTH_ERROR_USER_NOT_FOUND');
    });

    it('should throw an error if app is in demo mode', async () => {
      // arrange
      await TipiConfig.setConfig('demoMode', true);
      const email = faker.internet.email();
      const user = await createUser({ email });
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);

      // act & assert
      await expect(authService.getTotpUri({ userId: user.id, password: 'password' })).rejects.toThrowError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    });
  });

  describe('Test: setupTotp', () => {
    it('should enable totp for the user', async () => {
      // arrange
      const email = faker.internet.email();
      const totpSecret = TotpAuthenticator.generateSecret();
      const salt = faker.lorem.word();
      const encryptedTotpSecret = encrypt(totpSecret, salt);

      const user = await createUser({ email, totpSecret: encryptedTotpSecret, salt });
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);
      mockQueries.updateUser.calledWith(user.id, anyObject()).mockImplementation(async (_, data) => {
        user.totpEnabled = data.totpEnabled as boolean;
        return user;
      });

      const otp = TotpAuthenticator.generate(totpSecret);

      // act
      await authService.setupTotp({ userId: user.id, totpCode: otp });

      // assert
      expect(user).toHaveProperty('totpEnabled');
      expect(user.totpEnabled).toBeTruthy();
    });

    it('should throw if the user has already enabled totp', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email, totpEnabled: true });
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);

      // act & assert
      await expect(authService.setupTotp({ userId: user.id, totpCode: '1234' })).rejects.toThrowError('AUTH_ERROR_TOTP_ALREADY_ENABLED');
    });

    it('should throw if the user does not exist', async () => {
      // arrange
      const userId = 11;

      // act & assert
      await expect(authService.setupTotp({ userId, totpCode: '1234' })).rejects.toThrowError('AUTH_ERROR_USER_NOT_FOUND');
    });

    it('should throw if the otp is invalid', async () => {
      // arrange
      const email = faker.internet.email();
      const totpSecret = TotpAuthenticator.generateSecret();
      const salt = faker.lorem.word();
      const encryptedTotpSecret = encrypt(totpSecret, salt);

      const user = await createUser({ email, totpSecret: encryptedTotpSecret, salt });
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);

      // act & assert
      await expect(authService.setupTotp({ userId: user.id, totpCode: '1234' })).rejects.toThrowError('AUTH_ERROR_TOTP_INVALID_CODE');
    });

    it('should throw an error if app is in demo mode', async () => {
      // arrange
      await TipiConfig.setConfig('demoMode', true);
      const email = faker.internet.email();
      const user = await createUser({ email });
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);

      // act & assert
      await expect(authService.setupTotp({ userId: user.id, totpCode: '1234' })).rejects.toThrowError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    });
  });

  describe('Test: disableTotp', () => {
    it('should disable totp for the user', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email, totpEnabled: true });
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);
      mockQueries.updateUser.calledWith(user.id, anyObject()).mockImplementation(async (_, data) => {
        user.totpEnabled = data.totpEnabled as boolean;
        user.totpSecret = data.totpSecret as string;
        return user;
      });

      // act
      await authService.disableTotp({ userId: user.id, password: 'password' });

      // assert
      expect(user).toHaveProperty('totpEnabled');
      expect(user.totpEnabled).toBeFalsy();
    });

    it('should throw if the user has already disabled totp', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email, totpEnabled: false });
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);

      // act & assert
      await expect(authService.disableTotp({ userId: user.id, password: 'password' })).rejects.toThrowError('AUTH_ERROR_TOTP_NOT_ENABLED');
    });

    it('should throw if the user does not exist', async () => {
      // arrange
      const userId = 11;

      // act & assert
      await expect(authService.disableTotp({ userId, password: 'password' })).rejects.toThrowError('AUTH_ERROR_USER_NOT_FOUND');
    });

    it('should throw if the password is invalid', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email, totpEnabled: true });
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);

      // act & assert
      await expect(authService.disableTotp({ userId: user.id, password: 'wrong' })).rejects.toThrowError('AUTH_ERROR_INVALID_PASSWORD');
    });
  });

  describe('Register', () => {
    it('should correctly set session cookie', async () => {
      // arrange
      const email = faker.internet.email();
      mockQueries.getOperators.mockResolvedValue([]);
      mockQueries.createUser.calledWith(anyObject()).mockImplementation(async (args) => {
        return createUser(args);
      });
      mockSessionManager.setSession.calledWith(anyString(), anyString()).mockImplementation(async (sessionId) => {
        cookieStore.set('tipi.sid', sessionId);
      });

      // act
      await authService.register({ username: email, password: 'password' });
      const cookie = cookieStore.get('tipi.sid');

      // assert
      expect(cookie).toBeDefined();
      expect(cookie).not.toBeNull();
    });

    it('should correctly trim and lowercase email', async () => {
      // arrange
      const email = faker.internet.email();
      let user = {} as User;
      mockQueries.getOperators.mockResolvedValue([]);
      mockQueries.createUser.calledWith(anyObject()).mockImplementation(async (args) => {
        user = await createUser(args);
        return user;
      });

      // act
      await authService.register({ username: `${email.toUpperCase()} `, password: 'test' });

      // assert
      expect(user).toBeDefined();
      expect(user.username).toBe(email.toLowerCase().trim());
    });

    it('should throw if there is already an operator', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email, operator: true });
      mockQueries.getOperators.mockResolvedValue([user]);

      // act & assert
      await expect(authService.register({ username: email, password: 'test' })).rejects.toThrowError('AUTH_ERROR_ADMIN_ALREADY_EXISTS');
    });

    it('should throw if user already exists', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email, operator: false });
      mockQueries.getOperators.mockResolvedValue([]);
      mockQueries.getUserByUsername.calledWith(email.toLowerCase().trim()).mockResolvedValue(user);

      // act & assert
      await expect(authService.register({ username: email, password: 'test' })).rejects.toThrowError('AUTH_ERROR_USER_ALREADY_EXISTS');
    });

    it('should throw if email is not provided', async () => {
      // arrange
      mockQueries.getOperators.mockResolvedValue([]);

      await expect(authService.register({ username: '', password: 'test' })).rejects.toThrowError('AUTH_ERROR_MISSING_EMAIL_OR_PASSWORD');
    });

    it('should throw if password is not provided', async () => {
      mockQueries.getOperators.mockResolvedValue([]);

      await expect(authService.register({ username: faker.internet.email(), password: '' })).rejects.toThrowError(
        'AUTH_ERROR_MISSING_EMAIL_OR_PASSWORD',
      );
    });

    it('should correctly hash password', async () => {
      // arrange
      const email = faker.internet.email().toLowerCase().trim();
      let user = {} as User;
      mockQueries.getOperators.mockResolvedValue([]);
      mockQueries.createUser.calledWith(anyObject()).mockImplementation(async (args) => {
        user = await createUser(args);
        return user;
      });

      // act
      await authService.register({ username: email, password: 'test' });
      const isPasswordValid = await argon2.verify(user.password || '', 'test');

      // assert
      expect(isPasswordValid).toBe(true);
    });

    it('should throw if email is invalid', async () => {
      // arrange
      mockQueries.getOperators.mockResolvedValue([]);

      // act & assert
      await expect(authService.register({ username: 'test', password: 'test' })).rejects.toThrowError('AUTH_ERROR_INVALID_USERNAME');
    });

    it('should throw if database fails to create user', async () => {
      // arrange
      mockQueries.getOperators.mockResolvedValue([]);
      mockQueries.createUser.calledWith(anyObject()).mockResolvedValue(undefined);

      // act & assert
      await expect(authService.register({ username: faker.internet.email(), password: 'test' })).rejects.toThrowError(
        'AUTH_ERROR_ERROR_CREATING_USER',
      );
    });
  });

  describe('Test: logout', () => {
    it('should return true if there is no session to delete', async () => {
      // act
      const result = await authService.logout('session');

      // assert
      expect(result).toBe(true);
    });

    it('should destroy session upon logount', async () => {
      // arrange
      const sessionId = v4();
      await mockCache.set(`session:${sessionId}`, '1');

      // act
      const result = await authService.logout(sessionId);
      const session = await mockCache.get(`session:${sessionId}`);

      // assert
      expect(result).toBe(true);
      expect(session).toBeNull();
    });
  });

  describe('Test: me', () => {
    it('should return null if userId is not provided', async () => {
      // act
      const result = await authService.me(undefined);

      // assert
      expect(result).toBeNull();
    });

    it('should return null if user does not exist', async () => {
      // act
      const result = await authService.me(1);

      // assert
      expect(result).toBeNull();
    });

    it('should return user if user exists', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email });
      mockQueries.getUserDtoById.calledWith(user.id).mockResolvedValue(user);

      // act
      const result = await authService.me(user.id);

      // assert
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('username');
    });
  });

  describe('Test: isConfigured', () => {
    it('should return false if no user exists', async () => {
      // arrange
      mockQueries.getOperators.calledWith().mockResolvedValue([]);

      // act
      const result = await authService.isConfigured();

      // assert
      expect(result).toBe(false);
    });

    it('should return true if user exists', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email });
      mockQueries.getOperators.calledWith().mockResolvedValue([user]);

      // act
      const result = await authService.isConfigured();

      // assert
      expect(result).toBe(true);
    });
  });

  describe('Test: changeOperatorPassword', () => {
    it('should change the password of the operator user', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email });
      const previousPassword = user.password;
      const newPassword = faker.internet.password();
      mockQueries.getFirstOperator.calledWith().mockResolvedValue(user);
      mockQueries.updateUser.calledWith(user.id, anyObject()).mockImplementation(async (_, args) => {
        user.password = args.password as string;
        return user;
      });
      await fs.promises.writeFile(path.join(DATA_DIR, 'state', 'password-change-request'), new Date().getTime().toString());

      // act
      const result = await authService.changeOperatorPassword({ newPassword });

      // assert
      expect(result.email).toBe(email.toLowerCase());
      expect(user.password).not.toBe(previousPassword);
    });

    it('should throw if the password change request file does not exist', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email });
      const newPassword = faker.internet.password();
      mockQueries.getFirstOperator.calledWith().mockResolvedValue(user);

      // act & assert
      await expect(authService.changeOperatorPassword({ newPassword })).rejects.toThrowError('AUTH_ERROR_NO_CHANGE_PASSWORD_REQUEST');
    });

    it('should throw if there is no operator user', async () => {
      // arrange
      const newPassword = faker.internet.password();
      await fs.promises.writeFile(path.join(DATA_DIR, 'state', 'password-change-request'), new Date().getTime().toString());
      mockQueries.getFirstOperator.calledWith().mockResolvedValue(undefined);

      // act & assert
      await expect(authService.changeOperatorPassword({ newPassword })).rejects.toThrowError('AUTH_ERROR_OPERATOR_NOT_FOUND');
    });

    it('should reset totpSecret and totpEnabled if totp is enabled', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email, totpEnabled: true });
      const previousPassword = user.password;
      const newPassword = faker.internet.password();
      await fs.promises.writeFile(path.join(DATA_DIR, 'state', 'password-change-request'), new Date().getTime().toString());
      mockQueries.getFirstOperator.calledWith().mockResolvedValue(user);
      mockQueries.updateUser.calledWith(user.id, anyObject()).mockImplementation(async (_, args) => {
        user.password = args.password as string;
        user.totpEnabled = args.totpEnabled as boolean;
        user.totpSecret = args.totpSecret as string;
        return user;
      });

      // act
      const result = await authService.changeOperatorPassword({ newPassword });

      // assert
      expect(result.email).toBe(email.toLowerCase());
      expect(user.password).not.toBe(previousPassword);
      expect(user.totpEnabled).toBe(false);
      expect(user.totpSecret).toBeNull();
    });
  });

  describe('Test: checkPasswordChangeRequest', () => {
    it('should return true if the password change request file exists', async () => {
      // arrange
      await fs.promises.writeFile(path.join(DATA_DIR, 'state', 'password-change-request'), new Date().getTime().toString());

      // act
      const result = await authService.checkPasswordChangeRequest();

      // assert
      expect(result).toBe(true);
    });

    it('should return false if the password change request file does not exist', async () => {
      // act
      const result = await authService.checkPasswordChangeRequest();

      // assert
      expect(result).toBe(false);
    });
  });

  describe('Test: cancelPasswordChangeRequest', () => {
    it('should delete the password change request file', async () => {
      // arrange
      await fs.promises.writeFile(path.join(DATA_DIR, 'state', 'password-change-request'), new Date().getTime().toString());

      // act
      await authService.cancelPasswordChangeRequest();

      // assert
      expect(fs.existsSync(path.join(DATA_DIR, 'state', 'password-change-request'))).toBe(false);
    });
  });

  describe('Test: changePassword', () => {
    it('should change the password of the user', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email });
      const previousPassword = user.password;
      const newPassword = faker.internet.password();
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);
      mockQueries.updateUser.calledWith(user.id, anyObject()).mockImplementation(async (_, args) => {
        user.password = args.password as string;
        return user;
      });

      // act
      await authService.changePassword({ userId: user.id, newPassword, currentPassword: 'password' });

      // assert
      expect(user.password).not.toBe(previousPassword);
    });

    it('should throw if the user does not exist', async () => {
      // arrange
      const newPassword = faker.internet.password();

      // act & assert
      await expect(authService.changePassword({ userId: 1, newPassword, currentPassword: 'password' })).rejects.toThrowError(
        'AUTH_ERROR_USER_NOT_FOUND',
      );
    });

    it('should throw if the password is incorrect', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email });
      const newPassword = faker.internet.password();
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);

      // act & assert
      await expect(authService.changePassword({ userId: user.id, newPassword, currentPassword: 'wrongpassword' })).rejects.toThrowError(
        'AUTH_ERROR_INVALID_PASSWORD',
      );
    });

    it('should throw if password is less than 8 characters', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email });
      const newPassword = faker.internet.password({ length: 7 });
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);

      // act & assert
      await expect(authService.changePassword({ userId: user.id, newPassword, currentPassword: 'password' })).rejects.toThrowError(
        'AUTH_ERROR_INVALID_PASSWORD_LENGTH',
      );
    });

    it('should throw if instance is in demo mode', async () => {
      // arrange
      await TipiConfig.setConfig('demoMode', true);
      const email = faker.internet.email();
      const user = await createUser({ email });
      const newPassword = faker.internet.password();

      // act & assert
      await expect(authService.changePassword({ userId: user.id, newPassword, currentPassword: 'password' })).rejects.toThrowError(
        'SERVER_ERROR_NOT_ALLOWED_IN_DEMO',
      );
    });

    it('should delete all sessions for the user', async () => {
      // arrange
      const email = faker.internet.email();
      const user = await createUser({ email });
      const newPassword = faker.internet.password();
      await mockCache.set(`session:${user.id}:${faker.lorem.word()}`, 'test');
      mockQueries.getUserById.calledWith(user.id).mockResolvedValue(user);

      // act
      await authService.changePassword({ userId: user.id, newPassword, currentPassword: 'password' });

      // assert
      const sessions = await mockCache.getByPrefix(`session:${user.id}:`);
      expect(sessions).toHaveLength(0);
    });
  });
});
