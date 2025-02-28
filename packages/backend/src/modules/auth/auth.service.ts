import crypto from 'node:crypto';
import path from 'node:path';
import { TranslatableError } from '@/common/error/translatable-error';
import { CacheService } from '@/core/cache/cache.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { EncryptionService } from '@/core/encryption/encryption.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { UserRepository } from '@/modules/user/user.repository';
import { HttpStatus, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import validator, { isFQDN } from 'validator';
import type { LoginBody, RegisterBody } from './dto/auth.dto';
import { SessionManager } from './session.manager';
import { TotpAuthenticator } from './utils/totp-authenticator';

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private sessionManager: SessionManager,
    private config: ConfigurationService,
    private encryption: EncryptionService,
    private cache: CacheService,
    private filesystem: FilesystemService,
  ) {}

  public async getCookieDomain(domain?: string) {
    if (!domain || !isFQDN(domain)) {
      return undefined;
    }

    const parsed = psl.parse(domain);
    if (parsed.error) {
      return undefined;
    }

    return `.${parsed.input}`;
  }

  /**
   * Given a username and password, login the user and return the session ID.
   *
   * @param username - The username of the user to login.
   * @param password - The password of the user to login.
   * @returns The session ID.
   */
  public login = async (input: LoginBody) => {
    const { username, password } = input;

    const user = await this.userRepository.getUserByUsername(username);

    if (!user) {
      throw new TranslatableError('AUTH_ERROR_USER_NOT_FOUND', {}, HttpStatus.BAD_REQUEST);
    }

    const isPasswordValid = await argon2.verify(user.password, password);

    if (!isPasswordValid) {
      throw new TranslatableError('AUTH_ERROR_INVALID_CREDENTIALS', {}, HttpStatus.BAD_REQUEST);
    }

    if (user.totpEnabled) {
      const totpSessionId = crypto.randomUUID();
      this.cache.set(totpSessionId, user.id.toString());
      return { totpSessionId };
    }

    const sessionId = await this.sessionManager.createSession(user.id);

    return {
      sessionId,
    };
  };

  /**
   * Verify TOTP code and return a JWT token
   *
   * @param {object} params - An object containing the TOTP session ID and the TOTP code
   * @param {string} params.totpSessionId - The TOTP session ID
   * @param {string} params.totpCode - The TOTP code
   */
  public verifyTotp = async (params: { totpSessionId: string; totpCode: string }) => {
    const { totpSessionId, totpCode } = params;
    const userId = this.cache.get(totpSessionId);

    if (!userId) {
      throw new TranslatableError('AUTH_ERROR_TOTP_SESSION_NOT_FOUND');
    }

    const user = await this.userRepository.getUserById(Number(userId));

    if (!user) {
      throw new TranslatableError('AUTH_ERROR_USER_NOT_FOUND');
    }

    if (!user.totpEnabled || !user.totpSecret || !user.salt) {
      throw new TranslatableError('AUTH_ERROR_TOTP_NOT_ENABLED');
    }

    const totpSecret = this.encryption.decrypt(user.totpSecret, user.salt);
    const isValid = TotpAuthenticator.check(totpCode, totpSecret);

    if (!isValid) {
      throw new TranslatableError('AUTH_ERROR_TOTP_INVALID_CODE');
    }

    const sessionId = await this.sessionManager.createSession(user.id);

    this.cache.del(totpSessionId);

    return {
      sessionId,
    };
  };

  /**
   * Creates a new user with the provided email and password and returns a session token
   *
   * @param {LoginBody} input - An object containing the email and password fields
   */
  public register = async (input: RegisterBody) => {
    const operators = await this.userRepository.getOperators();

    if (operators.length > 0) {
      throw new TranslatableError('AUTH_ERROR_ADMIN_ALREADY_EXISTS', {}, HttpStatus.FORBIDDEN);
    }

    const { password, username } = input;
    const email = username.trim().toLowerCase();

    if (!username || !password) {
      throw new TranslatableError('AUTH_ERROR_MISSING_EMAIL_OR_PASSWORD', {}, HttpStatus.BAD_REQUEST);
    }

    if (username.length < 3 || !validator.isEmail(email)) {
      throw new TranslatableError('AUTH_ERROR_INVALID_USERNAME', {}, HttpStatus.BAD_REQUEST);
    }

    const user = await this.userRepository.getUserByUsername(email);

    if (user) {
      throw new TranslatableError('AUTH_ERROR_USER_ALREADY_EXISTS', {}, HttpStatus.BAD_REQUEST);
    }

    const hash = await argon2.hash(password);
    const newUser = await this.userRepository.createUser({ username: email, password: hash, operator: true });

    if (!newUser) {
      throw new TranslatableError('AUTH_ERROR_ERROR_CREATING_USER', {}, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const sessionId = await this.sessionManager.createSession(newUser.id);

    return {
      sessionId,
    };
  };

  /**
   * Logs out the currently logged in user.
   */
  public logout = async (sessionId: string) => {
    await this.sessionManager.deleteSession(sessionId);
  };

  /**
   * Change the username of the currently logged in user.
   */
  public changeUsername = async (params: { password: string; userId: number; newUsername: string }) => {
    if (this.config.get('demoMode')) {
      throw new TranslatableError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    }

    const { newUsername, password, userId } = params;

    const user = await this.userRepository.getUserById(userId);

    if (!user) {
      throw new TranslatableError('AUTH_ERROR_USER_NOT_FOUND');
    }

    const valid = await argon2.verify(user.password, password);

    if (!valid) {
      throw new TranslatableError('AUTH_ERROR_INVALID_PASSWORD');
    }

    const email = newUsername.trim().toLowerCase();

    if (!validator.isEmail(email)) {
      throw new TranslatableError('AUTH_ERROR_INVALID_USERNAME');
    }

    const existingUser = await this.userRepository.getUserByUsername(email);

    if (existingUser) {
      throw new TranslatableError('AUTH_ERROR_USER_ALREADY_EXISTS');
    }

    await this.userRepository.updateUser(user.id, { username: email });
    await this.sessionManager.destroyAllSessionsByUserId(user.id);

    return true;
  };

  public changePassword = async (params: { currentPassword: string; newPassword: string; userId: number }) => {
    if (this.config.get('demoMode')) {
      throw new TranslatableError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    }

    const { currentPassword, newPassword, userId } = params;

    const user = await this.userRepository.getUserById(userId);

    if (!user) {
      throw new TranslatableError('AUTH_ERROR_USER_NOT_FOUND');
    }

    const valid = await argon2.verify(user.password, currentPassword);

    if (!valid) {
      throw new TranslatableError('AUTH_ERROR_INVALID_PASSWORD');
    }

    if (newPassword.length < 8) {
      throw new TranslatableError('AUTH_ERROR_INVALID_PASSWORD_LENGTH');
    }

    const hash = await argon2.hash(newPassword);
    await this.userRepository.updateUser(user.id, { password: hash });
    await this.sessionManager.destroyAllSessionsByUserId(user.id);

    return true;
  };

  /**
   * Given a userId returns the TOTP URI and the secret key
   *
   * @param {object} params - An object containing the userId and the user's password
   * @param {number} params.userId - The user's ID
   * @param {string} params.password - The user's password
   */
  public getTotpUri = async (params: { userId: number; password: string }) => {
    if (this.config.get('demoMode')) {
      throw new TranslatableError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    }

    const { userId, password } = params;

    const user = await this.userRepository.getUserById(userId);

    if (!user) {
      throw new TranslatableError('AUTH_ERROR_USER_NOT_FOUND');
    }

    const isPasswordValid = await argon2.verify(user.password, password);
    if (!isPasswordValid) {
      throw new TranslatableError('AUTH_ERROR_INVALID_PASSWORD');
    }

    if (user.totpEnabled) {
      throw new TranslatableError('AUTH_ERROR_TOTP_ALREADY_ENABLED');
    }

    let { salt } = user;
    const newTotpSecret = TotpAuthenticator.generateSecret();

    if (!salt) {
      salt = this.sessionManager.generateSalt();
    }

    const encryptedTotpSecret = this.encryption.encrypt(newTotpSecret, salt);

    await this.userRepository.updateUser(userId, { totpSecret: encryptedTotpSecret, salt });

    const uri = TotpAuthenticator.keyuri(user.username, 'Runtipi', newTotpSecret);

    return { uri, key: newTotpSecret };
  };

  public setupTotp = async (params: { userId: number; totpCode: string }) => {
    if (this.config.get('demoMode')) {
      throw new TranslatableError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    }

    const { userId, totpCode } = params;
    const user = await this.userRepository.getUserById(userId);

    if (!user) {
      throw new TranslatableError('AUTH_ERROR_USER_NOT_FOUND');
    }

    if (user.totpEnabled || !user.totpSecret || !user.salt) {
      throw new TranslatableError('AUTH_ERROR_TOTP_ALREADY_ENABLED');
    }

    const totpSecret = this.encryption.decrypt(user.totpSecret, user.salt);
    const isValid = TotpAuthenticator.check(totpCode, totpSecret);

    if (!isValid) {
      throw new TranslatableError('AUTH_ERROR_TOTP_INVALID_CODE');
    }

    await this.userRepository.updateUser(userId, { totpEnabled: true });

    return true;
  };

  public disableTotp = async (params: { userId: number; password: string }) => {
    const { userId, password } = params;

    const user = await this.userRepository.getUserById(userId);

    if (!user) {
      throw new TranslatableError('AUTH_ERROR_USER_NOT_FOUND');
    }

    if (!user.totpEnabled) {
      throw new TranslatableError('AUTH_ERROR_TOTP_NOT_ENABLED');
    }

    const isPasswordValid = await argon2.verify(user.password, password);
    if (!isPasswordValid) {
      throw new TranslatableError('AUTH_ERROR_INVALID_PASSWORD');
    }

    await this.userRepository.updateUser(userId, { totpEnabled: false, totpSecret: null });

    return true;
  };

  /**
   * Change the password of the operator user
   *
   * @param {object} params - An object containing the new password
   * @param {string} params.newPassword - The new password
   */
  public changeOperatorPassword = async (params: { newPassword: string }) => {
    const isRequested = await this.checkPasswordChangeRequest();

    if (!isRequested) {
      throw new TranslatableError('AUTH_ERROR_NO_CHANGE_PASSWORD_REQUEST');
    }

    const { newPassword } = params;

    const user = await this.userRepository.getFirstOperator();

    if (!user) {
      throw new TranslatableError('AUTH_ERROR_OPERATOR_NOT_FOUND');
    }

    const hash = await argon2.hash(newPassword);

    await this.userRepository.updateUser(user.id, { password: hash, totpEnabled: false, totpSecret: null });

    const { dataDir } = this.config.get('directories');
    await this.filesystem.removeFile(path.join(dataDir, 'state', 'password-change-request'));

    await this.sessionManager.destroyAllSessionsByUserId(user.id);

    return { email: user.username };
  };

  /*
   * Check if there is a pending password change request for the given email
   * Returns true if there is a file in the password change requests folder with the given email
   *
   * @returns {boolean} - A boolean indicating if there is a password change request or not
   */
  public checkPasswordChangeRequest = async () => {
    const REQUEST_TIMEOUT_SECS = 15 * 60; // 15 minutes

    const { dataDir } = this.config.get('directories');
    const resetPasswordFilePath = path.join(dataDir, 'state', 'password-change-request');

    try {
      const timestamp = await this.filesystem.readTextFile(resetPasswordFilePath);

      if (!timestamp) {
        return false;
      }

      const requestCreation = Number(timestamp);
      return requestCreation + REQUEST_TIMEOUT_SECS > Date.now() / 1000;
    } catch {
      return false;
    }
  };

  /*
   * If there is a pending password change request, remove it
   * Returns true if the file is removed successfully
   *
   * @returns {boolean} - A boolean indicating if the file is removed successfully or not
   * @throws {Error} - If the file cannot be removed
   */
  public cancelPasswordChangeRequest = async () => {
    const { dataDir } = this.config.get('directories');
    const changeRequestPath = path.join(dataDir, 'state', 'password-change-request');

    await this.filesystem.removeFile(changeRequestPath);

    return true;
  };
}
