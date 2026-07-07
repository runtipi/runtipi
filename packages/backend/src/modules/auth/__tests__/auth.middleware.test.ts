import { FORWARD_AUTH_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/common/constants';
import { CacheService } from '@/core/cache/cache.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { UserRepository } from '@/modules/user/user.repository';
import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type MockProxy, mock } from 'vitest-mock-extended';
import { AuthMiddleware } from '../auth.middleware';

describe('AuthMiddleware', () => {
  const user = {
    id: 1,
    username: 'operator@example.com',
    totpEnabled: false,
    locale: 'en',
    operator: true,
    hasSeenWelcome: true,
  };

  let cache: MockProxy<CacheService>;
  let config: MockProxy<ConfigurationService>;
  let userRepository: MockProxy<UserRepository>;
  let middleware: AuthMiddleware;
  let next: NextFunction;

  beforeEach(() => {
    cache = mock<CacheService>();
    config = mock<ConfigurationService>();
    userRepository = mock<UserRepository>();
    middleware = new AuthMiddleware(cache, config, userRepository);
    next = vi.fn();
  });

  it('ignores dashboard session cookies for traefik auth requests', async () => {
    const req = {
      cookies: {
        [SESSION_COOKIE_NAME]: 'session-id',
      },
      headers: {},
      path: '/auth/traefik',
    } as unknown as Request;

    cache.get.mockReturnValue('1');
    userRepository.getUserDtoById.mockResolvedValue(user);

    await middleware.use(req, {} as Response, next);

    expect(req.user).toBeUndefined();
    expect(req.authMethod).toBeUndefined();
    expect(userRepository.getUserDtoById).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('prefers forward-auth cookies over dashboard session cookies for traefik auth requests', async () => {
    const req = {
      cookies: {
        [SESSION_COOKIE_NAME]: 'session-id',
        [FORWARD_AUTH_COOKIE_NAME]: 'forward-session-id',
      },
      path: '/auth/traefik',
      headers: {
        'x-forwarded-host': 'app.example.com',
      },
    } as unknown as Request;

    cache.get.mockImplementation((key: string) => {
      if (key === 'forward-auth-session:forward-session-id') return JSON.stringify({ sessionId: 'session-id', host: 'app.example.com' });
      if (key === 'session:session-id') return '1';
      return undefined;
    });
    userRepository.getUserDtoById.mockResolvedValue(user);

    await middleware.use(req, {} as Response, next);

    expect(cache.get).toHaveBeenCalledWith('forward-auth-session:forward-session-id');
    expect(cache.get).toHaveBeenCalledWith('session:session-id');
    expect(req.user).toEqual(user);
    expect(req.authMethod).toBe('forward-auth');
    expect(next).toHaveBeenCalledOnce();
  });

  it('detects traefik auth requests from the original url when path is rewritten', async () => {
    const req = {
      cookies: {
        [FORWARD_AUTH_COOKIE_NAME]: 'forward-session-id',
      },
      headers: {
        'x-forwarded-host': 'app.example.com',
      },
      originalUrl: '/api/auth/traefik',
      path: '/',
      url: '/',
    } as unknown as Request;

    cache.get.mockImplementation((key: string) => {
      if (key === 'forward-auth-session:forward-session-id') return JSON.stringify({ sessionId: 'session-id', host: 'app.example.com' });
      if (key === 'session:session-id') return '1';
      return undefined;
    });
    userRepository.getUserDtoById.mockResolvedValue(user);

    await middleware.use(req, {} as Response, next);

    expect(cache.get).toHaveBeenCalledWith('forward-auth-session:forward-session-id');
    expect(cache.get).toHaveBeenCalledWith('session:session-id');
    expect(req.user).toEqual(user);
    expect(req.authMethod).toBe('forward-auth');
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects forward-auth cookies issued for a different app host', async () => {
    const req = {
      cookies: {
        [FORWARD_AUTH_COOKIE_NAME]: 'forward-session-id',
      },
      headers: {
        'x-forwarded-host': 'other.example.com',
      },
      path: '/auth/traefik',
    } as unknown as Request;

    cache.get.mockImplementation((key: string) => {
      if (key === 'forward-auth-session:forward-session-id') return JSON.stringify({ sessionId: 'session-id', host: 'app.example.com' });
      if (key === 'session:session-id') return '1';
      return undefined;
    });
    userRepository.getUserDtoById.mockResolvedValue(user);

    await middleware.use(req, {} as Response, next);

    expect(cache.get).toHaveBeenCalledWith('forward-auth-session:forward-session-id');
    expect(cache.get).not.toHaveBeenCalledWith('session:session-id');
    expect(req.user).toBeUndefined();
    expect(req.authMethod).toBeUndefined();
    expect(userRepository.getUserDtoById).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('does not accept a dashboard session id as a forward-auth cookie value', async () => {
    const req = {
      cookies: {
        [FORWARD_AUTH_COOKIE_NAME]: 'session-id',
      },
      headers: {},
      path: '/auth/traefik',
    } as unknown as Request;

    cache.get.mockImplementation((key: string) => (key === 'session:session-id' ? '1' : undefined));
    userRepository.getUserDtoById.mockResolvedValue(user);

    await middleware.use(req, {} as Response, next);

    expect(cache.get).toHaveBeenCalledWith('forward-auth-session:session-id');
    expect(cache.get).not.toHaveBeenCalledWith('session:session-id');
    expect(req.user).toBeUndefined();
    expect(req.authMethod).toBeUndefined();
    expect(userRepository.getUserDtoById).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});
