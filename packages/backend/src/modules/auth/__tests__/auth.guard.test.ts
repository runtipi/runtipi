import { LoggerService } from '@/core/logger/logger.service';
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AuthGuard } from '../auth.guard';

const createContext = (request: {
  method: string;
  protocol?: string;
  url: string;
  body: Record<string, string>;
  headers?: Record<string, string>;
  user?: { id: number };
  authMethod?: 'session' | 'forward-auth' | 'cli';
}) =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as ExecutionContext;

describe('AuthGuard', () => {
  it('logs the request without including the request body for authenticated requests', async () => {
    const logger = mock<LoggerService>();
    const guard = new AuthGuard(logger);

    await expect(
      guard.canActivate(
        createContext({
          method: 'POST',
          protocol: 'http',
          url: '/auth/reset-password',
          body: { newPassword: 'super-secret', totpCode: '123456' },
          headers: {
            host: 'example.com',
            origin: 'http://example.com',
          },
          user: { id: 1 },
          authMethod: 'session',
        }),
      ),
    ).resolves.toBe(true);

    expect(logger.debug).toHaveBeenCalledWith('HTTP request', 'POST', '/auth/reset-password');
  });

  it('rejects unauthenticated requests', async () => {
    const logger = mock<LoggerService>();
    const guard = new AuthGuard(logger);

    await expect(
      guard.canActivate(
        createContext({
          method: 'GET',
          url: '/apps',
          body: {},
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('normalizes request host case before comparing unsafe request origins', async () => {
    const logger = mock<LoggerService>();
    const guard = new AuthGuard(logger);

    await expect(
      guard.canActivate(
        createContext({
          method: 'POST',
          protocol: 'https',
          url: '/apps',
          body: {},
          headers: {
            host: 'Example.COM',
            origin: 'https://example.com',
          },
          user: { id: 1 },
          authMethod: 'session',
        }),
      ),
    ).resolves.toBe(true);
  });

  it('uses forwarded proto and host when comparing unsafe request origins', async () => {
    const logger = mock<LoggerService>();
    const guard = new AuthGuard(logger);

    await expect(
      guard.canActivate(
        createContext({
          method: 'POST',
          protocol: 'https',
          url: '/apps',
          body: {},
          headers: {
            host: 'internal:3000',
            origin: 'https://example.com',
            'x-forwarded-host': 'example.com',
            'x-forwarded-proto': 'https',
          },
          user: { id: 1 },
          authMethod: 'session',
        }),
      ),
    ).resolves.toBe(true);
  });

  it('normalizes default ports before comparing unsafe request origins', async () => {
    const logger = mock<LoggerService>();
    const guard = new AuthGuard(logger);

    await expect(
      guard.canActivate(
        createContext({
          method: 'POST',
          protocol: 'https',
          url: '/apps',
          body: {},
          headers: {
            host: 'example.com:443',
            origin: 'https://example.com',
          },
          user: { id: 1 },
          authMethod: 'session',
        }),
      ),
    ).resolves.toBe(true);
  });

  it('rejects unsafe session requests without a matching origin', async () => {
    const logger = mock<LoggerService>();
    const guard = new AuthGuard(logger);

    await expect(
      guard.canActivate(
        createContext({
          method: 'POST',
          protocol: 'http',
          url: '/apps',
          body: {},
          headers: {
            host: 'example.com',
            origin: 'https://evil.com',
          },
          user: { id: 1 },
          authMethod: 'session',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects unsafe session requests from same host but different port', async () => {
    const logger = mock<LoggerService>();
    const guard = new AuthGuard(logger);

    await expect(
      guard.canActivate(
        createContext({
          method: 'POST',
          protocol: 'http',
          url: '/apps',
          body: {},
          headers: {
            host: 'example.com',
            origin: 'http://example.com:8443',
          },
          user: { id: 1 },
          authMethod: 'session',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects unsafe session requests from same host but different scheme', async () => {
    const logger = mock<LoggerService>();
    const guard = new AuthGuard(logger);

    await expect(
      guard.canActivate(
        createContext({
          method: 'POST',
          url: '/apps',
          body: {},
          headers: {
            host: 'example.com',
            origin: 'http://example.com',
            'x-forwarded-proto': 'https',
          },
          user: { id: 1 },
          authMethod: 'session',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('includes a Cloudflare Tunnel hint when Cloudflare headers are present on invalid origins', async () => {
    const logger = mock<LoggerService>();
    const guard = new AuthGuard(logger);

    await expect(
      guard.canActivate(
        createContext({
          method: 'POST',
          protocol: 'http',
          url: '/apps',
          body: {},
          headers: {
            host: 'example.com',
            origin: 'https://example.com',
            'cf-ray': '8f1234567890abcd-ZRH',
          },
          user: { id: 1 },
          authMethod: 'session',
        }),
      ),
    ).rejects.toThrow('Cloudflare headers were detected');
  });
});
