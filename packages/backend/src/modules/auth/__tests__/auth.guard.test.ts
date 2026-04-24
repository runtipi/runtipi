import { LoggerService } from '@/core/logger/logger.service';
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AuthGuard } from '../auth.guard';

const createContext = (request: {
  method: string;
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
          url: '/auth/reset-password',
          body: { newPassword: 'super-secret', totpCode: '123456' },
          user: { id: 1 },
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

  it('rejects unsafe session requests without a matching origin', async () => {
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
            origin: 'https://evil.com',
          },
          user: { id: 1 },
          authMethod: 'session',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
