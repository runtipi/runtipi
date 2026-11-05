import { FORWARD_AUTH_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/common/constants';
import { ConfigurationService } from '@/core/config/configuration.service';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import jsonwebtoken from 'jsonwebtoken';
import { UserRepository } from '../user/user.repository';
import { SessionCookies } from './session-cookies';
import { SessionManager } from './session.manager';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly sessions: SessionManager,
    private readonly config: ConfigurationService,
    private readonly userRepository: UserRepository,
    private readonly cookies: SessionCookies,
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
      const host = this.getForwardedHost(req);
      const session = this.sessions.getForwardAuthSession(forwardAuthSessionId, host);
      if (!session) {
        return next();
      }

      const user = await this.userRepository.getUserDtoById(session.userId);
      if (!user || !this.sessions.refreshForwardAuthSession(forwardAuthSessionId, host)) {
        return next();
      }

      req.user = user;
      req.authMethod = 'forward-auth';
      this.cookies.setForwardAuth(res, forwardAuthSessionId, req);
      return next();
    }

    if (sessionId && !isTraefikAuthRequest) {
      const userId = this.sessions.getSessionUserId(sessionId);
      if (userId === undefined) {
        return next();
      }

      const user = await this.userRepository.getUserDtoById(userId);
      if (!user || !this.sessions.refreshSession(sessionId)) {
        return next();
      }

      req.user = user;
      req.authMethod = 'session';
      this.cookies.setSession(res, sessionId, req);
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
