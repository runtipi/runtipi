import type { Request } from 'express';
import { Injectable, type CanActivate, type ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest() as Request;

    if (!request.user) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
