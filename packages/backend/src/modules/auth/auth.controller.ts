import { SESSION_COOKIE_MAX_AGE, SESSION_COOKIE_NAME } from '@/common/constants';
import { TranslatableError } from '@/common/error/translatable-error';
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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  @ZodSerializerDto(LoginDto)
  async login(@Body() body: LoginBody, @Res({ passthrough: true }) res: Response): Promise<LoginDto> {
    const { sessionId, totpSessionId } = await this.authService.login(body);

    if (totpSessionId) {
      return { success: true, totpSessionId };
    }

    res.cookie(SESSION_COOKIE_NAME, sessionId, { httpOnly: true, secure: false, sameSite: false, maxAge: SESSION_COOKIE_MAX_AGE });

    return { success: true };
  }

  @Post('/verify-totp')
  @ZodSerializerDto(LoginDto)
  async verifyTotp(@Body() body: VerifyTotpBody, @Res({ passthrough: true }) res: Response): Promise<LoginDto> {
    const { sessionId } = await this.authService.verifyTotp(body);

    res.cookie(SESSION_COOKIE_NAME, sessionId, { httpOnly: true, secure: false, sameSite: false, maxAge: SESSION_COOKIE_MAX_AGE });

    return { success: true };
  }

  @Post('/register')
  @ZodSerializerDto(RegisterDto)
  async register(@Body() body: RegisterBody, @Res({ passthrough: true }) res: Response): Promise<RegisterDto> {
    const { sessionId } = await this.authService.register(body);

    res.cookie(SESSION_COOKIE_NAME, sessionId, { httpOnly: true, secure: false, sameSite: false, maxAge: SESSION_COOKIE_MAX_AGE });

    return { success: true };
  }

  @Post('/logout')
  async logout(@Res() res: Response, @Req() req: Request) {
    res.clearCookie(SESSION_COOKIE_NAME);
    const sessionId = req.cookies['tipi.sid'];

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
}
