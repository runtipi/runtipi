import { FORWARD_AUTH_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/common/constants';
import { CacheService } from '@/core/cache/cache.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import jsonwebtoken from 'jsonwebtoken';
import { UserRepository } from '../user/user.repository';

type ForwardAuthSession = {
  sessionId: string;
  host: string;
};

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly cache: CacheService,
    private readonly config: ConfigurationService,
    private readonly userRepository: UserRepository,
  ) {}

  private isTraefikAuthRequest(req: Request) {
    return [req.path, req.originalUrl, req.url].some((url) => url?.split('?')[0]?.endsWith('/auth/traefik'));
  }

  private getForwardedHost(req: Request) {
    return (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim().split(':')[0]?.toLowerCase();
  }

  private getForwardAuthSession(token: string): ForwardAuthSession | null {
    try {
      const session = JSON.parse(token) as ForwardAuthSession;
      if (!session.sessionId || !session.host) {
        return null;
      }

      return { sessionId: session.sessionId, host: session.host.toLowerCase() };
    } catch {
      return null;
    }
  }

  async use(req: Request, _: Response, next: NextFunction) {
    const sessionId = req.cookies[SESSION_COOKIE_NAME];
    const forwardAuthSessionId = req.cookies[FORWARD_AUTH_COOKIE_NAME];
    const bearerToken = req.headers.authorization;
    const isTraefikAuthRequest = this.isTraefikAuthRequest(req);

    if (forwardAuthSessionId && isTraefikAuthRequest) {
      const forwardAuthSession = this.getForwardAuthSession(this.cache.get(`forward-auth-session:${forwardAuthSessionId}`) ?? '');
      const forwardedHost = this.getForwardedHost(req);
      const userId =
        forwardAuthSession && forwardedHost && forwardAuthSession.host === forwardedHost
          ? this.cache.get(`session:${forwardAuthSession.sessionId}`)
          : undefined;
      const numericUserId = Number(userId);

      if (!Number.isNaN(numericUserId)) {
        const user = await this.userRepository.getUserDtoById(numericUserId);
        req.user = user;
        req.authMethod = 'forward-auth';
      }

      return next();
    }

    if (sessionId && !isTraefikAuthRequest) {
      const userId = this.cache.get(`session:${sessionId}`);
      if (!Number.isNaN(Number(userId))) {
        const user = await this.userRepository.getUserDtoById(Number(userId));
        req.user = user;
        req.authMethod = 'session';
      }

      return next();
    }

    if (bearerToken) {
      const token = bearerToken.split(' ')[1];

      if (!token) {
        return next();
      }

      const jwtSecret = this.config.get('jwtSecret');

      try {
        const { sub } = jsonwebtoken.verify(token, jwtSecret) as { sub: string };
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
