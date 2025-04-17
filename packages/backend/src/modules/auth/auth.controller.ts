import { SESSION_COOKIE_MAX_AGE, SESSION_COOKIE_NAME } from '@/common/constants';
import { TranslatableError } from '@/common/error/translatable-error';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Body, Controller, Delete, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import {
  ChangePasswordBody,
  ChangeUsernameBody,
  CheckResetPasswordRequestDto,
  DisableTotpBody,
  GetTotpUriBody,
  GetTotpUriDto,
  LoginBody,
  LoginDto,
  RegisterBody,
  RegisterDto,
  ResetPasswordBody,
  ResetPasswordDto,
  SetupTotpBody,
  VerifyTotpBody,
} from './dto/auth.dto';
import { capitalize } from '@/common/helpers/format-helpers';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
  ) {}

  private async setSessionCookie(res: Response, sessionId: string, req: Request) {
    const host = req.headers['x-forwarded-host'] as string | undefined;
    const proto = req.headers['x-forwarded-proto'] as string | undefined;
    const domain = await this.authService.getCookieDomain(host);
    const secure = Boolean(domain) && proto === 'https';

    this.logger.debug('Request headers', req.headers);
    this.logger.debug('Setting session cookie', { host, domain, proto, secure });

    if (this.config.get('userSettings').experimental.insecureCookie) {
      this.logger.warn('WARNING: Using insecure cookies. This is not recommended for production environments.');
      res.cookie(SESSION_COOKIE_NAME, sessionId, { httpOnly: true, secure: false, sameSite: false, maxAge: SESSION_COOKIE_MAX_AGE });
    } else {
      res.cookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        maxAge: SESSION_COOKIE_MAX_AGE,
        domain,
      });
    }
  }

  @Post('/login')
  @ZodSerializerDto(LoginDto)
  async login(@Body() body: LoginBody, @Res({ passthrough: true }) res: Response, @Req() req: Request): Promise<LoginDto> {
    const { sessionId, totpSessionId } = await this.authService.login(body);

    if (totpSessionId) {
      return { success: true, totpSessionId };
    }

    await this.setSessionCookie(res, sessionId, req);

    return { success: true };
  }

  @Post('/verify-totp')
  @ZodSerializerDto(LoginDto)
  async verifyTotp(@Body() body: VerifyTotpBody, @Res({ passthrough: true }) res: Response, @Req() req: Request): Promise<LoginDto> {
    const { sessionId } = await this.authService.verifyTotp(body);

    await this.setSessionCookie(res, sessionId, req);

    return { success: true };
  }

  @Post('/register')
  @ZodSerializerDto(RegisterDto)
  async register(@Body() body: RegisterBody, @Res({ passthrough: true }) res: Response, @Req() req: Request): Promise<RegisterDto> {
    const { sessionId } = await this.authService.register(body);

    await this.setSessionCookie(res, sessionId, req);

    return { success: true };
  }

  @Post('/logout')
  async logout(@Res() res: Response, @Req() req: Request) {
    res.clearCookie(SESSION_COOKIE_NAME);
    const sessionId = req.cookies[SESSION_COOKIE_NAME];

    if (!sessionId) {
      return;
    }

    await this.authService.logout(sessionId);

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
  @ZodSerializerDto(GetTotpUriDto)
  async getTotpUri(@Body() body: GetTotpUriBody, @Req() req: Request): Promise<GetTotpUriDto> {
    const userId = req.user?.id;

    if (!userId) {
      throw new TranslatableError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN');
    }

    return this.authService.getTotpUri({ userId, ...body });
  }

  @Patch('/totp/setup')
  @UseGuards(AuthGuard)
  async setupTotp(@Body() body: SetupTotpBody, @Req() req: Request): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      throw new TranslatableError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN');
    }

    await this.authService.setupTotp({ userId, totpCode: body.code });
  }

  @Patch('/totp/disable')
  @UseGuards(AuthGuard)
  async disableTotp(@Body() body: DisableTotpBody, @Req() req: Request): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      throw new TranslatableError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN');
    }

    await this.authService.disableTotp({ userId, ...body });
  }

  @Post('/reset-password')
  @ZodSerializerDto(ResetPasswordDto)
  async resetPassword(@Body() body: ResetPasswordBody): Promise<ResetPasswordDto> {
    const { email } = await this.authService.changeOperatorPassword(body);

    return { success: true, email };
  }

  @Delete('/reset-password')
  async cancelResetPassword(): Promise<void> {
    await this.authService.cancelPasswordChangeRequest();
  }

  @Get('/reset-password')
  async checkResetPasswordRequest(): Promise<CheckResetPasswordRequestDto> {
    const isPending = await this.authService.checkPasswordChangeRequest();

    return { isRequestPending: isPending };
  }

  @Get('/traefik')
  async traefik(@Req() req: Request, @Res() res: Response) {
    if (req.user) {
      this.logger.debug('User already logged in');
      return res.status(200).send();
    }

    const uri = req.headers['x-forwarded-uri'] as string;
    const proto = req.headers['x-forwarded-proto'] as string;
    const host = req.headers['x-forwarded-host'] as string;

    const appName = req.headers['x-runtipi-name'] as string;
    const appUrn = req.headers['x-runtipi-urn'] as string;

    this.logger.debug('Auth request', { uri, proto, host, appName, appUrn });

    const subdomains = host.split('.');
    const app = subdomains[0] ?? '';
    const rootDomain = subdomains.slice(1).join('.');

    const redirectUrl = new URL(uri, `${proto}://${host}`);

    const loginUrl = new URL('/login', `${proto}://${rootDomain}`);
    loginUrl.searchParams.set('redirect_url', redirectUrl.toString());
    loginUrl.searchParams.set('name', appName ?? capitalize(subdomains[0] ?? ''));
    loginUrl.searchParams.set('urn', appUrn ?? '');

    this.logger.debug('Redirecting to login', { loginUrl: loginUrl.toString(), redirectUrl: redirectUrl.toString(), appName, appUrn });

    return res.status(302).redirect(loginUrl.toString());
  }
}
