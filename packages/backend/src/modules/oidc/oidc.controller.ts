import { Controller, Get, Injectable, Post, UseGuards, Body, Patch, Param, Delete, Req, Query, Res } from '@nestjs/common';
import { OidcService } from './oidc.service';
import { ApiResponse } from '@nestjs/swagger';
import { OidcProviderAuthResDto, OidcProviderDto, OidcProvidersDto, PublicOidcProvidersDto } from './dto/oidc.dto';
import { AuthGuard } from '../auth/auth.guard';
import { type Request as ExpressRequest, type Response as ExpressResponse } from 'express';
import { AuthService } from '../auth/auth.service';
import { UserRepository } from '../user/user.repository';
import { SessionManager } from '../auth/session.manager';

@Injectable()
@Controller('oidc')
export class OidcController {
  // temp
  private trustedSubs: Array<string> = [];

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
  @ApiResponse({ type: OidcProvidersDto })
  @UseGuards(AuthGuard)
  async createProvider(@Body() provider: OidcProviderDto) {
    return await this.oidcService.createOidcProvider(provider);
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
    return await this.oidcService.deleteOidcProvider(id);
  }

  @Post('providers/:id/url')
  @ApiResponse({ type: OidcProviderAuthResDto })
  async getProviderAuthUrl(@Param('id') id: number, @Req() req: ExpressRequest) {
    const reqUrl = new URL(`${req.protocol}://${req.host}${req.url}`);
    const authUrl = await this.oidcService.getProviderAuthUrl(id, reqUrl);
    return OidcProviderAuthResDto.parse({ url: authUrl });
  }

  @Get('providers/:id/callback')
  async handleCallback(@Param('id') id: number, @Query() query: { state: string }, @Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const reqUrl = new URL(`${req.protocol}://${req.host}${req.url}`);
    const tokenRes = await this.oidcService.getTokenFromCallback(query.state, reqUrl);

    const userInfo = await this.oidcService.fetchUserInfo(id, tokenRes.access_token);

    if (!req.user) {
      if (this.trustedSubs.includes(userInfo.sub)) {
        const user = await this.userRepository.getFirstOperator();

        if (!user) {
          throw new Error('Failed to find operator');
        }

        const sessionId = await this.sessionManager.createSession(user.id);

        await this.authService.setSessionCookie(res, sessionId, req);

        return res.redirect(`${reqUrl.origin}/dashboard`);
      }
      throw new Error('Unauthorized');
    }

    if (!this.trustedSubs.includes(userInfo.sub)) {
      this.trustedSubs.push(userInfo.sub);
    }

    return res.redirect(`${reqUrl.origin}/settings?tab=security`);
  }
}
