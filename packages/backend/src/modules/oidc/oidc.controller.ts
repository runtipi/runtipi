import { SESSION_COOKIE_NAME } from '@/common/constants';
import { LoggerService } from '@/core/logger/logger.service';
import { AuthGuard } from '@/modules/auth/auth.guard';
import { AuthService } from '@/modules/auth/auth.service';
import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  CreateOIDCProviderDto,
  EditOIDCProviderDto,
  GetOIDCProviderDto,
  GetOIDCProvidersDto,
  GetOIDCProviderURLDto,
  LinkOIDCProviderBody,
  OIDCProvidersLoginDto,
  StartOIDCLoginBody,
  TrustedSubsDto,
} from './dto/oidc.dto';
import { OIDCRepository } from './oidc.repository';
import { OIDCService, OIDC_TRANSACTION_TTL } from './oidc.service';

const flowCookieName = (req: Request) => (req.secure ? '__Host-runtipi-oidc' : 'runtipi-oidc');

@Controller('oidc')
export class OIDCController {
  constructor(
    private readonly oidc: OIDCService,
    private readonly repository: OIDCRepository,
    private readonly auth: AuthService,
    private readonly logger: LoggerService,
  ) {}

  private userId(req: Request) {
    if (!req.user) throw new UnauthorizedException();

    return req.user.id;
  }

  private actor(req: Request) {
    const sessionId = req.cookies[SESSION_COOKIE_NAME];
    if (req.authMethod !== 'session' || !req.user || typeof sessionId !== 'string') return undefined;

    return { userId: req.user.id, sessionId };
  }

  private callbackUrl(req: Request, slug: string) {
    return new URL(`/api/oidc/providers/${encodeURIComponent(slug)}/callback`, `${req.protocol}://${req.host}`);
  }

  private startResponse(req: Request, res: Response, authorization: { state: string; url: string }) {
    res.cookie(flowCookieName(req), authorization.state, {
      httpOnly: true,
      secure: req.secure,
      sameSite: 'lax',
      path: '/',
      maxAge: OIDC_TRANSACTION_TTL * 1000,
    });

    return GetOIDCProviderURLDto.parse({ url: authorization.url });
  }

  @Get('providers/login')
  @ApiResponse({ type: OIDCProvidersLoginDto })
  async getLoginProviders() {
    return OIDCProvidersLoginDto.parse({ providers: await this.repository.getOIDCProviders() });
  }

  @Get('providers/user')
  @ApiResponse({ type: GetOIDCProvidersDto })
  @UseGuards(AuthGuard)
  async getUserProviders(@Req() req: Request) {
    return GetOIDCProvidersDto.parseUnknown({ providers: await this.repository.getOIDCProvidersForUser(this.userId(req)) });
  }

  @Post('providers/new')
  @ApiResponse({ type: GetOIDCProviderDto })
  @UseGuards(AuthGuard)
  async createProvider(@Body() body: CreateOIDCProviderDto, @Req() req: Request) {
    return GetOIDCProviderDto.parseUnknown(await this.repository.createOIDCProvider(body, this.userId(req)));
  }

  @Patch('providers/:slug/edit')
  @ApiResponse({ type: GetOIDCProviderDto })
  @UseGuards(AuthGuard)
  async editProvider(@Param('slug') slug: string, @Body() body: EditOIDCProviderDto, @Req() req: Request) {
    return GetOIDCProviderDto.parseUnknown(await this.repository.editOIDCProvider(slug, this.userId(req), body));
  }

  @Delete('providers/:slug/delete')
  @UseGuards(AuthGuard)
  deleteProvider(@Param('slug') slug: string, @Req() req: Request) {
    return this.repository.deleteOIDCProvider(slug, this.userId(req));
  }

  @Post('providers/:slug/url')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiResponse({ type: GetOIDCProviderURLDto })
  async getProviderAuthURL(
    @Param('slug') slug: string,
    @Body() body: StartOIDCLoginBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (req.user) throw new BadRequestException('Use the account linking action while signed in');

    const authorization = await this.oidc.authorize(slug, this.callbackUrl(req, slug), { purpose: 'login', redirectUrl: body.redirectUrl });

    return this.startResponse(req, res, authorization);
  }

  @Post('providers/:slug/link')
  @UseGuards(AuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiResponse({ type: GetOIDCProviderURLDto })
  async linkProvider(
    @Param('slug') slug: string,
    @Body() body: LinkOIDCProviderBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const actor = this.actor(req);
    if (!actor) throw new UnauthorizedException('Account linking requires a browser session');

    await this.auth.confirmPassword(actor.userId, body.password);
    const authorization = await this.oidc.authorize(slug, this.callbackUrl(req, slug), { purpose: 'link', ...actor });

    return this.startResponse(req, res, authorization);
  }

  @Get('providers/:slug/callback')
  async handleProviderCallback(@Param('slug') slug: string, @Req() req: Request, @Res() res: Response) {
    res.clearCookie(flowCookieName(req), { path: '/', secure: req.secure, httpOnly: true, sameSite: 'lax' });
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');

    try {
      if (req.user && !this.actor(req)) throw new UnauthorizedException();

      const url = new URL(req.originalUrl, `${req.protocol}://${req.host}`);
      const result = await this.oidc.authenticate(slug, url, req.cookies[flowCookieName(req)], this.actor(req));
      if (result.purpose === 'link') return res.redirect('/settings?tab=security&sub_created=true');

      const { sessionId, totpSessionId } = await this.auth.createLoginSession(result.userId);
      const destination = new URL('/login', url.origin);
      if (result.redirectUrl) destination.searchParams.set('redirect_url', result.redirectUrl);

      if (totpSessionId) {
        destination.hash = new URLSearchParams({ totp_session_id: totpSessionId }).toString();
        return res.redirect(`${destination.pathname}${destination.search}${destination.hash}`);
      }

      await this.auth.setSessionCookie(res, sessionId, req);
      if (result.redirectUrl) return res.redirect(`${destination.pathname}${destination.search}`);

      return res.redirect('/dashboard');
    } catch (error) {
      this.logger.warn('OIDC callback rejected', error instanceof Error ? error.name : 'Unknown error');
      return res.redirect('/error?error=AUTH_ERROR_OIDC&redirect_to=login');
    }
  }

  @Get('subs/trusted')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: TrustedSubsDto })
  async getTrustedSubs(@Req() req: Request) {
    const identities = await this.repository.getTrustedSubsForUser(this.userId(req));

    return TrustedSubsDto.parse({ subs: identities.map((identity) => ({ ...identity, createdAt: identity.createdAt.getTime() })) });
  }

  @Delete('subs/:slug/delete')
  @UseGuards(AuthGuard)
  deleteTrustedSub(@Param('slug') slug: string, @Req() req: Request) {
    return this.repository.deleteOIDCTrustedSub(slug, this.userId(req));
  }
}
