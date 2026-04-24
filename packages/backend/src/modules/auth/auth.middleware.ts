import { FORWARD_AUTH_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/common/constants';
import { CacheService } from '@/core/cache/cache.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import jsonwebtoken from 'jsonwebtoken';
import { UserRepository } from '../user/user.repository';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly cache: CacheService,
    private readonly config: ConfigurationService,
    private readonly userRepository: UserRepository,
  ) {}

  // cookie-parser keeps one value per name; stale cookies from older domains can mask the fresh forward-auth cookie.
  private getCookieValues(req: Request, name: string) {
    const values = new Set<string>();
    const parsedValue = req.cookies?.[name];

    if (typeof parsedValue === 'string') {
      values.add(parsedValue);
    }

    const rawCookieHeader = req.headers.cookie;
    const cookieHeaders = Array.isArray(rawCookieHeader) ? rawCookieHeader : [rawCookieHeader];

    for (const cookieHeader of cookieHeaders) {
      if (!cookieHeader) {
        continue;
      }

      for (const cookie of cookieHeader.split(';')) {
        const [cookieName, ...cookieValueParts] = cookie.split('=');
        if (cookieName?.trim() !== name || cookieValueParts.length === 0) {
          continue;
        }

        const cookieValue = cookieValueParts.join('=').trim();
        if (!cookieValue) {
          continue;
        }

        try {
          values.add(decodeURIComponent(cookieValue));
        } catch {
          values.add(cookieValue);
        }
      }
    }

    return [...values];
  }

  async use(req: Request, _: Response, next: NextFunction) {
    const sessionId = req.cookies[SESSION_COOKIE_NAME];
    const forwardAuthSessionIds = this.getCookieValues(req, FORWARD_AUTH_COOKIE_NAME);
    const bearerToken = req.headers.authorization;
    const isTraefikAuthRequest = req.path.endsWith('/auth/traefik');

    if (forwardAuthSessionIds.length > 0 && isTraefikAuthRequest) {
      for (const forwardAuthSessionId of forwardAuthSessionIds) {
        const sessionId = this.cache.get(`forward-auth:${forwardAuthSessionId}`);
        const userId = sessionId ? this.cache.get(`session:${sessionId}`) : undefined;
        const numericUserId = Number(userId);

        if (Number.isNaN(numericUserId)) {
          continue;
        }

        const user = await this.userRepository.getUserDtoById(numericUserId);
        if (user) {
          req.user = user;
          req.authMethod = 'forward-auth';
          break;
        }
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
