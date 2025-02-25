import { SESSION_COOKIE_MAX_AGE, SESSION_COOKIE_NAME } from '@/common/constants';
import { TranslatableError } from '@/common/error/translatable-error';
import { Body, Controller, Delete, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Request, Response } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import validator from 'validator';
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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setSessionCookie(res: Response, sessionId: string, host?: string) {
    try {
      const domain = host?.split('.') ?? [];

      if (validator.isFQDN(host ?? '') && domain.length > 2) {
        domain.shift();
      }

      res.cookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: false,
        sameSite: false,
        maxAge: SESSION_COOKIE_MAX_AGE,
        domain: validator.isFQDN(domain.join('.')) ? `.${domain.join('.')}` : undefined,
      });
    } catch (error) {
      Sentry.captureException(error, { extra: { host } });

      res.cookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: false,
        sameSite: false,
        maxAge: SESSION_COOKIE_MAX_AGE,
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

    const host = req.headers['x-forwarded-host'] as string | undefined;
    this.setSessionCookie(res, sessionId, host);

    return { success: true };
  }

  @Post('/verify-totp')
  @ZodSerializerDto(LoginDto)
  async verifyTotp(@Body() body: VerifyTotpBody, @Res({ passthrough: true }) res: Response, @Req() req: Request): Promise<LoginDto> {
    const { sessionId } = await this.authService.verifyTotp(body);

    const host = req.headers['x-forwarded-host'] as string | undefined;
    this.setSessionCookie(res, sessionId, host);

    return { success: true };
  }

  @Post('/register')
  @ZodSerializerDto(RegisterDto)
  async register(@Body() body: RegisterBody, @Res({ passthrough: true }) res: Response, @Req() req: Request): Promise<RegisterDto> {
    const { sessionId } = await this.authService.register(body);

    const host = req.headers['x-forwarded-host'] as string | undefined;
    this.setSessionCookie(res, sessionId, host);

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
      return res.status(200).send();
    }

    const uri = req.headers['x-forwarded-uri'] as string;
    const proto = req.headers['x-forwarded-proto'] as string;
    const host = req.headers['x-forwarded-host'] as string;

    const subdomains = host.split('.');
    const app = subdomains[0] ?? '';
    const rootDomain = subdomains.slice(1).join('.');

    const redirectUrl = new URL(uri, `${proto}://${host}`);

    const loginUrl = new URL('/login', `${proto}://${rootDomain}`);
    loginUrl.searchParams.set('redirect_url', redirectUrl.toString());
    loginUrl.searchParams.set('app', app);

    return res.status(302).redirect(loginUrl.toString());
  }
}
