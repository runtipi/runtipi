import crypto from 'node:crypto';
import { FORWARD_AUTH_COOKIE_NAME, SESSION_COOKIE_MAX_AGE, SESSION_COOKIE_NAME } from '@/common/constants';
import { TranslatableError } from '@/common/error/translatable-error';
import { CacheService } from '@/core/cache/cache.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Body, Controller, Get, Patch, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import {
  ChangePasswordBody,
  ChangeUsernameBody,
  DisableTotpBody,
  GetTotpUriBody,
  GetTotpUriDto,
  ForwardAuthBody,
  LoginBody,
  LoginDto,
  RegisterBody,
  RegisterDto,
  ResetPasswordBody,
  ResetPasswordDto,
  SetupTotpBody,
  VerifyTotpBody,
} from './dto/auth.dto';
import { ApiResponse } from '@nestjs/swagger';

const AUTH_THROTTLE_TTL = 60_000;
const AUTH_THROTTLE_LIMIT = 20;
const FORWARD_AUTH_SESSION_EXPIRATION = SESSION_COOKIE_MAX_AGE / 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
    private readonly cache: CacheService,
  ) {}

  private getRequestHost(req: Request) {
    const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host;
    return host?.split(',')[0]?.trim().split(':')[0]?.toLowerCase();
  }

  private isSafeForwardAuthRedirect(req: Request, redirectUrl?: string) {
    if (!redirectUrl) {
      return false;
    }

    const host = this.getRequestHost(req);
    if (!host) {
      return false;
    }

    try {
      const url = new URL(redirectUrl);
      return ['http:', 'https:'].includes(url.protocol) && url.hostname.endsWith(`.${host}`);
    } catch {
      return false;
    }
  }

  private setForwardAuthCookie(res: Response, sessionId: string, req: Request, redirectUrl: string) {
    const domain = this.authService.getCookieDomain(this.getRequestHost(req));
    const proto = req.headers['x-forwarded-proto'] as string | undefined;
    const secure = proto === 'https';

    if (!domain || !this.isSafeForwardAuthRedirect(req, redirectUrl)) {
      return false;
    }

    const forwardAuthSessionId = crypto.randomUUID();
    this.cache.set(`forward-auth:${forwardAuthSessionId}`, sessionId, FORWARD_AUTH_SESSION_EXPIRATION);

    res.cookie(FORWARD_AUTH_COOKIE_NAME, forwardAuthSessionId, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: SESSION_COOKIE_MAX_AGE,
      domain,
    });

    return true;
  }

  private async setSessionCookie(res: Response, sessionId: string, req: Request, redirectUrl?: string) {
    const host = this.getRequestHost(req);
    const proto = req.headers['x-forwarded-proto'] as string | undefined;
    const secure = proto === 'https';

    this.logger.debug('Request headers', req.headers);
    this.logger.debug('Setting session cookie', { host, proto, secure });

    if (this.config.get('userSettings').experimental.insecureCookie) {
      this.logger.warn('WARNING: Using insecure cookies. This is not recommended for production environments.');
      res.cookie(SESSION_COOKIE_NAME, sessionId, { httpOnly: true, secure: false, sameSite: false, maxAge: SESSION_COOKIE_MAX_AGE });
    } else {
      const legacyDomain = this.authService.getCookieDomain(host);
      if (legacyDomain) {
        res.clearCookie(SESSION_COOKIE_NAME, { domain: legacyDomain });
      }

      res.cookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        maxAge: SESSION_COOKIE_MAX_AGE,
      });
    }

    if (redirectUrl) {
      this.setForwardAuthCookie(res, sessionId, req, redirectUrl);
    }
  }

  @Post('/login')
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: AUTH_THROTTLE_LIMIT } })
  @ApiResponse({ type: LoginDto })
  async login(@Body() body: LoginBody, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const { sessionId, totpSessionId } = await this.authService.login(body);

    if (totpSessionId) {
      return { success: true, totpSessionId };
    }

    await this.setSessionCookie(res, sessionId, req, body.redirectUrl);

    return LoginDto.parse({ success: true }, { reportOnly: true });
  }

  @Post('/verify-totp')
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: AUTH_THROTTLE_LIMIT } })
  @ApiResponse({ type: LoginDto })
  async verifyTotp(@Body() body: VerifyTotpBody, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const { sessionId } = await this.authService.verifyTotp(body);

    await this.setSessionCookie(res, sessionId, req, body.redirectUrl);

    return LoginDto.parse({ success: true }, { reportOnly: true });
  }

  @Post('/register')
  @ApiResponse({ type: RegisterDto })
  async register(@Body() body: RegisterBody, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const { sessionId } = await this.authService.register(body);

    await this.setSessionCookie(res, sessionId, req);

    return RegisterDto.parse({ success: true }, { reportOnly: true });
  }

  @Post('/logout')
  async logout(@Res() res: Response, @Req() req: Request) {
    const domain = this.authService.getCookieDomain(this.getRequestHost(req));
    res.clearCookie(SESSION_COOKIE_NAME);
    if (domain) {
      res.clearCookie(FORWARD_AUTH_COOKIE_NAME, { domain });
    }
    const sessionId = req.cookies[SESSION_COOKIE_NAME];
    const forwardAuthSessionId = req.cookies[FORWARD_AUTH_COOKIE_NAME];

    if (forwardAuthSessionId) {
      this.cache.del(`forward-auth:${forwardAuthSessionId}`);
    }

    if (!sessionId) {
      return;
    }

    await this.authService.logout(sessionId);

    return res.status(204).send();
  }

  @Post('/forward-auth')
  @UseGuards(AuthGuard)
  async forwardAuth(@Body() body: ForwardAuthBody, @Req() req: Request, @Res() res: Response) {
    const sessionId = req.cookies[SESSION_COOKIE_NAME];

    if (req.authMethod !== 'session' || !sessionId) {
      throw new UnauthorizedException();
    }

    if (!this.setForwardAuthCookie(res, sessionId, req, body.redirectUrl)) {
      throw new UnauthorizedException();
    }

    return res.status(204).send();
  }

  @Patch('/username')
  @UseGuards(AuthGuard)
  async changeUsername(@Body() body: ChangeUsernameBody, @Req() req: Request, @Res() res: Response) {
    const userId = req.user?.id;

    if (!userId) {
      throw new TranslatableError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN');
    }

    await this.authService.changeUsername({ userId, ...body });

    res.clearCookie(SESSION_COOKIE_NAME);
    return res.status(204).send();
  }

  @Patch('/password')
  @UseGuards(AuthGuard)
  async changePassword(@Body() body: ChangePasswordBody, @Req() req: Request, @Res() res: Response) {
    const userId = req.user?.id;

    if (!userId) {
      throw new TranslatableError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN');
    }

    await this.authService.changePassword({ userId, ...body });

    res.clearCookie(SESSION_COOKIE_NAME);
    return res.status(204).send();
  }

  @Patch('/totp/get-uri')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: GetTotpUriDto })
  async getTotpUri(@Body() body: GetTotpUriBody, @Req() req: Request) {
    const userId = req.user?.id;

    if (!userId) {
      throw new TranslatableError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN');
    }

    const res = await this.authService.getTotpUri({ userId, ...body });
    return GetTotpUriDto.parse(res, { reportOnly: true });
  }

  @Patch('/totp/setup')
  @UseGuards(AuthGuard)
  async setupTotp(@Body() body: SetupTotpBody, @Req() req: Request) {
    const userId = req.user?.id;

    if (!userId) {
      throw new TranslatableError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN');
    }

    await this.authService.setupTotp({ userId, totpCode: body.code });
  }

  @Patch('/totp/disable')
  @UseGuards(AuthGuard)
  async disableTotp(@Body() body: DisableTotpBody, @Req() req: Request) {
    const userId = req.user?.id;

    if (!userId) {
      throw new TranslatableError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN');
    }

    await this.authService.disableTotp({ userId, ...body });
  }

  @Post('/reset-password')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: ResetPasswordDto })
  async resetPassword(@Body() body: ResetPasswordBody, @Req() req: Request) {
    if (req.authMethod !== 'cli') {
      throw new UnauthorizedException();
    }

    const { email } = await this.authService.changeOperatorPassword(body);

    return ResetPasswordDto.parse({ success: true, email }, { reportOnly: true });
  }

  @Get('/traefik')
  @SkipThrottle()
  async traefik(@Req() req: Request, @Res() res: Response) {
    if (req.user && req.authMethod === 'forward-auth') {
      this.logger.debug('User already logged in');
      return res.status(200).send();
    }

    const uri = req.headers['x-forwarded-uri'] as string;
    const proto = req.headers['x-forwarded-proto'] as string;
    const host = req.headers['x-forwarded-host'] as string;

    this.logger.debug('Auth request', { uri, proto, host });

    const subdomains = host.split('.');
    const app = subdomains[0] ?? '';
    const rootDomain = subdomains.slice(1).join('.');

    const redirectUrl = new URL(uri, `${proto}://${host}`);

    const loginUrl = new URL('/login', `${proto}://${rootDomain}`);
    loginUrl.searchParams.set('redirect_url', redirectUrl.toString());
    loginUrl.searchParams.set('app', app);

    this.logger.debug('Redirecting to login', { loginUrl: loginUrl.toString(), redirectUrl: redirectUrl.toString(), app });

    return res.status(302).redirect(loginUrl.toString());
  }
}
