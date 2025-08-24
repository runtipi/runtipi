import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class DebugGuard implements CanActivate {
  constructor(
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest() as Request;

    this.logger.debug('HTTP request', request.method, request.url, request.body);

    if (this.config.get('__prod__')) {
      throw new ForbiddenException('Debug endpoints are not allowed in production mode.');
    }

    return true;
  }
}
