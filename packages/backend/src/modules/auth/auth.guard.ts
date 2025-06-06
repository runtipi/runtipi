import { LoggerService } from '@/core/logger/logger.service';
import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly logger: LoggerService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest() as Request;

    this.logger.debug('HTTP request', request.method, request.url, request.body);

    if (!request.user) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
