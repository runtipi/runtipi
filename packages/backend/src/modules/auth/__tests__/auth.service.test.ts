import { FORWARD_AUTH_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/common/constants';
import { CacheService } from '@/core/cache/cache.service';
import { EncryptionService } from '@/core/encryption/encryption.service';
import { PasswordService } from '@/core/password/password.service';
import { UserRepository } from '@/modules/user/user.repository';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type MockProxy, mock } from 'vitest-mock-extended';
import { AuthService } from '../auth.service';
import { SessionManager } from '../session.manager';
import { TotpAuthenticator } from '../utils/totp-authenticator';

describe('AuthService', () => {
  let authService: AuthService;
  let cacheService: MockProxy<CacheService>;
  let userRepository: MockProxy<UserRepository>;
  let passwordService: MockProxy<PasswordService>;
  let encryptionService: MockProxy<EncryptionService>;
  let sessionManager: MockProxy<SessionManager>;

  const totpUser = {
    id: 1,
    username: 'operator@example.com',
    password: 'hashed-password',
    createdAt: 1,
    updatedAt: 1,
    totpEnabled: true,
    totpSecret: 'encrypted-secret',
    salt: 'totp-salt',
    locale: 'en',
    operator: true,
    hasSeenWelcome: true,
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AuthService],
    })
      .useMocker(mock)
      .compile();

    authService = moduleRef.get(AuthService);
    cacheService = moduleRef.get(CacheService);
    userRepository = moduleRef.get(UserRepository);
    passwordService = moduleRef.get(PasswordService);
    encryptionService = moduleRef.get(EncryptionService);
    sessionManager = moduleRef.get(SessionManager);
    sessionManager.getSessionMaxAgeInSeconds.mockReturnValue(604_800);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  it('stores TOTP login sessions for five minutes', async () => {
    userRepository.getUserByUsername.mockResolvedValue(totpUser);
    passwordService.verify.mockResolvedValue(true);

    const result = await authService.login({ username: totpUser.username, password: 'password' });

    expect(result.totpSessionId).toEqual(expect.any(String));
    expect(cacheService.set).toHaveBeenCalledWith(expect.any(String), '1', 300);
  });

  it('counts invalid TOTP attempts for the session', async () => {
    cacheService.get.mockImplementation((key: string) => {
      if (key === 'session-id') {
        return '1';
      }

      return undefined;
    });
    userRepository.getUserById.mockResolvedValue(totpUser);
    encryptionService.decrypt.mockReturnValue('decrypted-secret');
    vi.spyOn(TotpAuthenticator, 'check').mockReturnValue(false);

    await expect(authService.verifyTotp({ totpSessionId: 'session-id', totpCode: '000000' })).rejects.toThrow('AUTH_ERROR_TOTP_INVALID_CODE');

    expect(cacheService.set).toHaveBeenCalledWith('totp-attempts:session-id', '1', 300);
    expect(cacheService.del).not.toHaveBeenCalled();
  });

  it('invalidates the TOTP session after the fifth invalid code', async () => {
    cacheService.get.mockImplementation((key: string) => {
      if (key === 'session-id') {
        return '1';
      }

      if (key === 'totp-attempts:session-id') {
        return '4';
      }

      return undefined;
    });
    userRepository.getUserById.mockResolvedValue(totpUser);
    encryptionService.decrypt.mockReturnValue('decrypted-secret');
    vi.spyOn(TotpAuthenticator, 'check').mockReturnValue(false);

    await expect(authService.verifyTotp({ totpSessionId: 'session-id', totpCode: '000000' })).rejects.toThrow('AUTH_ERROR_TOTP_TOO_MANY_ATTEMPTS');

    expect(cacheService.del).toHaveBeenCalledWith('totp-attempts:session-id');
    expect(cacheService.del).toHaveBeenCalledWith('session-id');
  });

  describe('getCookieDomain', () => {
    it('should return undefined if the domain is localhost', async () => {
      const domain = 'localhost';
      const result = await authService.getCookieDomain(domain);
      expect(result).toBeUndefined();
    });

    it('should return undefined if the domain is an IP address', async () => {
      const domain = '192.168.3.20';
      const result = await authService.getCookieDomain(domain);
      expect(result).toBeUndefined();
    });

    it('should return with subdomain', async () => {
      const domain = 'example.duckdns.org';
      const result = await authService.getCookieDomain(domain);

      expect(result).toBe(`.${domain}`);
    });

    it('should return input if domain is not using a standard tld', async () => {
      const domain = 'example.whatever';
      const result = await authService.getCookieDomain(domain);

      expect(result).toBe(`.${domain}`);
    });

    it('should return all subdomains when using multiple levels of subdomains', async () => {
      const domain = 'sub.sub.duckdns.org';
      const result = await authService.getCookieDomain(domain);

      expect(result).toBe('.sub.sub.duckdns.org');
    });
  });

  describe('forward-auth sessions', () => {
    const session = { sessionId: 'session-id', host: 'app.example.com' };

    it('renews the dashboard session and the forward-auth session without setting the dashboard cookie', () => {
      const res = { cookie: vi.fn() } as unknown as Response;
      const req = fromPartial<Request>({ headers: { 'x-forwarded-proto': 'https' } });

      authService.refreshForwardAuthSession(res, req, 'forward-auth-session-id', session);

      expect(sessionManager.refreshSession).toHaveBeenCalledWith('session-id');
      expect(cacheService.set).toHaveBeenCalledWith('forward-auth-session:forward-auth-session-id', JSON.stringify(session), 604_800);
      expect(cacheService.set).toHaveBeenCalledWith(
        'forward-auth-by-session:session-id:session:forward-auth-session-id',
        'forward-auth-session:forward-auth-session-id',
        604_800,
      );
      expect(res.cookie).toHaveBeenCalledWith(FORWARD_AUTH_COOKIE_NAME, 'forward-auth-session-id', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 604_800_000,
      });
      expect(res.cookie).not.toHaveBeenCalledWith(SESSION_COOKIE_NAME, expect.anything(), expect.anything());
    });

    it('scopes a new forward-auth session to the app host', () => {
      const res = { cookie: vi.fn() } as unknown as Response;
      const req = fromPartial<Request>({ headers: { 'x-forwarded-proto': 'http' } });

      authService.createForwardAuthSession(res, req, 'session-id', 'app.example.com');

      expect(cacheService.set).toHaveBeenCalledWith(expect.stringMatching(/^forward-auth-session:/), JSON.stringify(session), 604_800);
      expect(res.cookie).toHaveBeenCalledWith(FORWARD_AUTH_COOKIE_NAME, expect.any(String), {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 604_800_000,
      });
    });
  });
});
