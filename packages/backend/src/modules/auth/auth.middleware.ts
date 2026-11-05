import { FORWARD_AUTH_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/common/constants';
import { CacheService } from '@/core/cache/cache.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import jsonwebtoken from 'jsonwebtoken';
import { UserRepository } from '../user/user.repository';
import { AuthService } from './auth.service';
import { forwardAuthSessionKey, parseForwardAuthSession } from './forward-auth-session';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly cache: CacheService,
    private readonly config: ConfigurationService,
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService,
  ) {}

  private isTraefikAuthRequest(req: Request) {
    return [req.path, req.originalUrl, req.url].some((url) => url?.split('?')[0]?.endsWith('/auth/traefik'));
  }

  private getForwardedHost(req: Request) {
    return (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim().split(':')[0]?.toLowerCase();
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const sessionId = req.cookies[SESSION_COOKIE_NAME];
    const forwardAuthSessionId = req.cookies[FORWARD_AUTH_COOKIE_NAME];
    const bearerToken = req.headers.authorization;
    const isTraefikAuthRequest = this.isTraefikAuthRequest(req);

    if (forwardAuthSessionId && isTraefikAuthRequest) {
      const forwardAuthSession = parseForwardAuthSession(this.cache.get(forwardAuthSessionKey(forwardAuthSessionId)) ?? '');
      const forwardedHost = this.getForwardedHost(req);
      const userId =
        forwardAuthSession && forwardedHost && forwardAuthSession.host === forwardedHost
          ? this.cache.get(`session:${forwardAuthSession.sessionId}`)
          : undefined;
      const numericUserId = Number(userId);

      if (forwardAuthSession && !Number.isNaN(numericUserId)) {
        const user = await this.userRepository.getUserDtoById(numericUserId);
        req.user = user;
        req.authMethod = 'forward-auth';
        this.authService.refreshForwardAuthSession(res, req, forwardAuthSessionId, forwardAuthSession);
      }

      return next();
    }

    if (sessionId && !isTraefikAuthRequest) {
      const userId = this.cache.get(`session:${sessionId}`);
      if (!Number.isNaN(Number(userId))) {
        const user = await this.userRepository.getUserDtoById(Number(userId));
        req.user = user;
        req.authMethod = 'session';
        this.authService.refreshSession(res, sessionId, req);
      }

      return next();
    }

    if (bearerToken) {
      const token = bearerToken.split(' ')[1];

      if (!token) {
        return next();
      }

      const cliSecret = this.config.get('cliSecret');

      try {
        const { sub } = jsonwebtoken.verify(token, cliSecret, { algorithms: ['HS256'] }) as { sub: string };
        if (sub === 'cli') {
          const user = await this.userRepository.getFirstOperator();
          req.user = user;
          req.authMethod = 'cli';
        }

        return next();
      } catch (_error) {
        return next();
      }
    }

    return next();
  }
}
