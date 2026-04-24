import { LoggerService } from '@/core/logger/logger.service';
import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const getHost = (value: string | undefined) => value?.split(',')[0]?.trim().split(':')[0]?.toLowerCase();

const requestHost = (request: Request) => getHost((request.headers['x-forwarded-host'] as string | undefined) ?? request.headers.host);

const headerHost = (value: string | undefined) => {
  if (!value) return undefined;

  try {
    return new URL(value).hostname;
  } catch {
    return undefined;
  }
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly logger: LoggerService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest() as Request;

    this.logger.debug('HTTP request', request.method, request.url);

    if (!request.user) {
      throw new UnauthorizedException();
    }

    if (request.authMethod === 'forward-auth') {
      throw new UnauthorizedException();
    }

    if (request.authMethod === 'session' && UNSAFE_METHODS.has(request.method)) {
      const host = requestHost(request);
      const originHost = headerHost(request.headers.origin);
      const refererHost = headerHost(request.headers.referer);

      if (!host || (originHost !== host && refererHost !== host)) {
        throw new ForbiddenException('Invalid request origin');
      }
    }

    return true;
  }
}
