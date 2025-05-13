import { SESSION_COOKIE_NAME } from '@/common/constants.js';
import { CacheService } from '@/core/cache/cache.service.js';
import { ConfigurationService } from '@/core/config/configuration.service.js';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import jsonwebtoken from 'jsonwebtoken';
import { UserRepository } from '../user/user.repository.js';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly cache: CacheService,
    private readonly config: ConfigurationService,
    private readonly userRepository: UserRepository,
  ) {}

  async use(req: Request, _: Response, next: NextFunction) {
    const sessionId = req.cookies[SESSION_COOKIE_NAME];
    const bearerToken = req.headers.authorization;

    if (sessionId) {
      const userId = this.cache.get(`session:${sessionId}`);
      if (!Number.isNaN(Number(userId))) {
        const user = await this.userRepository.getUserDtoById(Number(userId));
        req.user = user;
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
        }

        return next();
      } catch (error) {
        return next();
      }
    }

    return next();
  }
}
