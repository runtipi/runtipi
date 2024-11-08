import { CacheService } from '@/core/cache/cache.service';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { UserRepository } from '../user/user.repository';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly cache: CacheService,
    private readonly userRepository: UserRepository,
  ) {}

  async use(req: Request, _: Response, next: NextFunction) {
    const sessionId = req.cookies['tipi.sid'];

    if (sessionId) {
      const userId = await this.cache.get(`session:${sessionId}`);
      if (!Number.isNaN(Number(userId))) {
        const user = await this.userRepository.getUserDtoById(Number(userId));
        req.user = user;
      }
    }

    next();
  }
}
