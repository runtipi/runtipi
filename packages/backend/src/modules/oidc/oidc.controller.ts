import { Controller, Get, Injectable, Post, UseGuards, Body, Patch, Param, Delete, Req, Query, Res } from '@nestjs/common';
import { OidcService } from './oidc.service';
import { ApiResponse } from '@nestjs/swagger';
import { OidcProviderAuthResDto, OidcProviderDto, OidcProvidersDto, PublicOidcProvidersDto, TrustedSubsDto } from './dto/oidc.dto';
import { AuthGuard } from '../auth/auth.guard';
import { type Request as ExpressRequest, type Response as ExpressResponse } from 'express';
import { AuthService } from '../auth/auth.service';
import { UserRepository } from '../user/user.repository';
import { SessionManager } from '../auth/session.manager';

@Injectable()
@Controller('oidc')
export class OidcController {
  constructor(
    private readonly oidcService: OidcService,
    private readonly authService: AuthService,
    private readonly userRepository: UserRepository,
    private readonly sessionManager: SessionManager,
  ) {}

  @Get('providers/public')
  @ApiResponse({ type: PublicOidcProvidersDto })
  async getProvidersPublic() {
    const publicProviders = await this.oidcService.getOidcProvidersPublic();
    return {
      providers: publicProviders,
    };
  }

  @Get('providers/private')
  @ApiResponse({ type: OidcProvidersDto })
  @UseGuards(AuthGuard)
  async getProvidersPrivate() {
    const privateProviders = await this.oidcService.getOidcProviders();
    return {
      providers: privateProviders,
    };
  }

  @Post('providers/new')
  @ApiResponse({ type: OidcProviderDto })
  @UseGuards(AuthGuard)
  async createProvider(@Body() provider: OidcProviderDto) {
    const res = await this.oidcService.createOidcProvider(provider);
    if (!res) {
      throw new Error('Failed to create provider');
    }
    return OidcProviderDto.parse({ ...res });
  }

  @Patch('providers/:id/edit')
  @ApiResponse({ type: OidcProvidersDto })
  @UseGuards(AuthGuard)
  async editProvider(@Param('id') id: number, @Body() provider: OidcProviderDto) {
    return await this.oidcService.editOidcProvider(id, provider);
  }

  @Delete('providers/:id/delete')
  @ApiResponse({ type: OidcProvidersDto })
  @UseGuards(AuthGuard)
  async deleteProvider(@Param('id') id: number) {
    await this.oidcService.deleteTrustedSubsByProviderId(id);
    return await this.oidcService.deleteOidcProvider(id);
  }

  @Post('providers/:id/url')
  @ApiResponse({ type: OidcProviderAuthResDto })
  async getProviderAuthUrl(@Param('id') id: number, @Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const reqUrl = new URL(`${req.protocol}://${req.host}${req.url}`);
    const authUrl = await this.oidcService.getProviderAuthUrl(id, reqUrl);

    if (!authUrl) {
      const params = new URLSearchParams({ error: 'Failed to get auth url', redirect_to: '/login' });
      return res.redirect(`${reqUrl.origin}/error?${params}`);
    }

    return OidcProviderAuthResDto.parse({ url: authUrl });
  }

  @Get('providers/:id/callback')
  async handleCallback(@Param('id') id: number, @Query() query: { state: string }, @Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const reqUrl = new URL(`${req.protocol}://${req.host}${req.url}`);

    const provider = await this.oidcService.getOidcProviderById(id);

    if (!provider) {
      const params = new URLSearchParams({ error: 'Provider not found', redirect_to: '/login' });
      return res.redirect(`${reqUrl.origin}/error?${params}`);
    }

    const tokenRes = await this.oidcService.getTokenFromCallback(query.state, reqUrl);

    if (!tokenRes) {
      const params = new URLSearchParams({ error: 'Failed to get token', redirect_to: '/login' });
      return res.redirect(`${reqUrl.origin}/error?${params}`);
    }

    const userInfo = await this.oidcService.fetchUserInfo(id, tokenRes.access_token);

    if (!userInfo) {
      const params = new URLSearchParams({ error: 'Failed to get user info', redirect_to: '/login' });
      return res.redirect(`${reqUrl.origin}/error?${params}`);
    }

    if (!req.user) {
      const trustedSubEntry = await this.oidcService.getTrustedSub(userInfo.sub);

      if (!trustedSubEntry) {
        const params = new URLSearchParams({ error: 'Unauthorized', redirect_to: '/login' });
        return res.redirect(`${reqUrl.origin}/error?${params}`);
      }

      const user = await this.userRepository.getFirstOperator();

      if (!user) {
        const params = new URLSearchParams({ error: 'Failed to find operator', redirect_to: '/login' });
        return res.redirect(`${reqUrl.origin}/error?${params}`);
      }

      const sessionId = await this.sessionManager.createSession(user.id);

      await this.authService.setSessionCookie(res, sessionId, req);

      return res.redirect(`${reqUrl.origin}/dashboard`);
    }

    const trustedSubEntry = await this.oidcService.getTrustedSub(userInfo.sub);

    if (!trustedSubEntry) {
      await this.oidcService.storeTrustedSub(userInfo.sub, req.user.id, provider.id);
    }

    return res.redirect(`${reqUrl.origin}/settings?tab=security`);
  }

  @Get('/subs/trusted')
  @ApiResponse({ status: 200, type: TrustedSubsDto })
  @UseGuards(AuthGuard)
  async getTrustedSubs(@Req() req: ExpressRequest) {
    if (!req.user) {
      return 401;
    }

    const trustedSubs = await this.oidcService.getTrustedSubsByUserId(req.user.id);
    return TrustedSubsDto.parse({
      subs: trustedSubs,
    });
  }

  @Delete('/subs/:id/delete')
  @UseGuards(AuthGuard)
  async deleteTrustedSub(@Param('id') id: number) {
    return await this.oidcService.deleteTrustedSub(id);
  }
}
