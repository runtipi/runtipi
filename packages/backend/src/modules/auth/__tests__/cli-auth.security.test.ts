import { CacheService } from '@/core/cache/cache.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { UserRepository } from '@/modules/user/user.repository';
import { fromPartial } from '@total-typescript/shoehorn';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AuthMiddleware } from '../auth.middleware';

test.each([
  { name: 'legacy JWT secret', key: 'legacy-encryption-secret', algorithm: 'HS256' as const, authenticated: false },
  { name: 'private CLI key', key: 'c'.repeat(64), algorithm: 'HS256' as const, authenticated: true },
  { name: 'another HMAC algorithm', key: 'c'.repeat(64), algorithm: 'HS512' as const, authenticated: false },
])('CLI authentication using $name', async ({ key, algorithm, authenticated }) => {
  const config = mock<ConfigurationService>();
  config.get.calledWith('jwtSecret').mockReturnValue('legacy-encryption-secret');
  config.get.calledWith('cliSecret').mockReturnValue('c'.repeat(64));

  const userRepository = mock<UserRepository>();
  const operator = fromPartial<Awaited<ReturnType<UserRepository['getFirstOperator']>>>({ id: 1, operator: true });
  userRepository.getFirstOperator.mockResolvedValue(operator);

  const middleware = new AuthMiddleware(mock<CacheService>(), config, userRepository);
  const token = jwt.sign({ sub: 'cli' }, key, { algorithm, expiresIn: '1h' });
  const request = fromPartial<Request>({ cookies: {}, headers: { authorization: `Bearer ${token}` } });
  const next = vi.fn();

  await middleware.use(request, fromPartial<Response>({}), next);

  expect(next).toHaveBeenCalledOnce();

  if (authenticated) {
    expect(request.user).toEqual(operator);
    expect(request.authMethod).toBe('cli');
  } else {
    expect(request.user).toBeUndefined();
    expect(request.authMethod).toBeUndefined();
    expect(userRepository.getFirstOperator).not.toHaveBeenCalled();
  }
});
