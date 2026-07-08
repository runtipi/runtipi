import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { OIDCService } from './oidc.service';
import { ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { type Request as ExpressRequest, type Response as ExpressResponse } from 'express';
import { AuthService } from '../auth/auth.service';
import { UserRepository } from '../user/user.repository';
import { SessionManager } from '../auth/session.manager';
import {
  CreateOIDCProviderDto,
  EditOIDCProviderDto,
  GetOIDCProviderDto,
  GetOIDCProvidersDto,
  GetOIDCProviderURLDto,
  OIDCProvidersLoginDto,
  TrustedSubsDto,
} from '@/modules/oidc/dto/oidc.dto';

@Injectable()
@Controller('oidc')
export class OIDCController {
  constructor(
    private readonly oidcService: OIDCService,
    private readonly authService: AuthService,
    private readonly userRepository: UserRepository,
    private readonly sessionManager: SessionManager,
  ) {}

  @Get('providers/login')
  @ApiResponse({ type: OIDCProvidersLoginDto })
  async getLoginProviders() {
    const providers = await this.oidcService.getOIDCProvidersLogin();
    if (typeof providers === 'undefined') {
      throw new InternalServerErrorException();
    }
    return providers;
  }

  // OIDC Service is designed to handle multiple users but since
  // we don't have a user ID available we will the use the one from
  // the request
  @Get('providers/user')
  @ApiResponse({ type: GetOIDCProvidersDto })
  @UseGuards(AuthGuard)
  async getProvidersPrivate(@Req() req: ExpressRequest) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    const providers = await this.oidcService.getUserOIDCProviders(req.user.id);
    if (typeof providers === 'undefined') {
      throw new InternalServerErrorException();
    }
    return providers;
  }

  @Post('providers/new')
  @ApiResponse({ type: GetOIDCProviderDto })
  @UseGuards(AuthGuard)
  async createProvider(@Body() provider: CreateOIDCProviderDto, @Req() req: ExpressRequest) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    const res = await this.oidcService.createOIDCProvider(provider, req.user.id);
    if (typeof res === 'undefined') {
      throw new InternalServerErrorException();
    }
    return GetOIDCProviderDto.parse(res);
  }

  @Patch('providers/:slug/edit')
  @ApiResponse({ type: GetOIDCProviderDto })
  @UseGuards(AuthGuard)
  async editProvider(@Param('slug') slug: string, @Body() provider: EditOIDCProviderDto, @Req() req: ExpressRequest) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    const res = await this.oidcService.editOIDCProvider(slug, provider);
    if (typeof res === 'undefined') {
      throw new InternalServerErrorException();
    }
    return GetOIDCProviderDto.parse(res);
  }

  @Delete('providers/:id/delete')
  @UseGuards(AuthGuard)
  async deleteProvider(@Param('slug') slug: string) {
    return await this.oidcService.deleteOIDCProvider(slug);
  }

  @Post('providers/:id/slug')
  @ApiResponse({ type: GetOIDCProviderURLDto })
  async getProviderAuthURL(@Param('slug') slug: string, @Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const reqURL = new URL(`${req.protocol}://${req.host}${req.url}`);
    const authURL = await this.oidcService.getProviderAuthURL(slug, reqURL, typeof req.user !== 'undefined');

    if (!authURL) {
      const params = new URLSearchParams({ error: 'Failed to get auth url', redirect_to: 'login' });
      return res.redirect(`${reqURL.origin}/error?${params}`);
    }

    return res.json(
      GetOIDCProviderURLDto.parse({
        slug: slug,
        url: authURL,
      }),
    );
  }

  @Get('providers/:slug/callback')
  async handleProviderCallback(
    @Param('slug') slug: string,
    @Query() query: { state: string },
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    const reqURL = new URL(`${req.protocol}://${req.host}${req.url}`);

    const provider = await this.oidcService.getOIDCProviderBySlug(slug);

    if (!provider) {
      const params = new URLSearchParams({ error: 'Provider not found', redirect_to: 'login' });
      return res.redirect(`${reqURL.origin}/error?${params}`);
    }

    const tokenRes = await this.oidcService.getTokenFromCallback(query.state, reqURL, typeof req.user !== 'undefined');

    if (!tokenRes) {
      const params = new URLSearchParams({ error: 'Failed to get token', redirect_to: 'login' });
      return res.redirect(`${reqURL.origin}/error?${params}`);
    }

    const userInfo = await this.oidcService.fetchUserInfo(provider.id, tokenRes.access_token);

    if (!userInfo) {
      const params = new URLSearchParams({ error: 'Failed to get user info', redirect_to: 'login' });
      return res.redirect(`${reqURL.origin}/error?${params}`);
    }

    if (!req.user) {
      const trustedSubEntry = await this.oidcService.getTrustedSub(provider.id, userInfo.sub);

      if (!trustedSubEntry) {
        const params = new URLSearchParams({ error: 'Unauthorized', redirect_to: 'login' });
        return res.redirect(`${reqURL.origin}/error?${params}`);
      }

      const user = await this.userRepository.getUserById(trustedSubEntry.userId);

      if (!user) {
        throw new UnauthorizedException();
      }

      const sessionId = await this.sessionManager.createSession(user.id);

      await this.authService.setSessionCookie(res, sessionId, req);

      return res.redirect(`${reqURL.origin}/dashboard`);
    }

    const trustedSubEntry = await this.oidcService.getTrustedSub(provider.id, userInfo.sub);

    if (!trustedSubEntry) {
      await this.oidcService.createOIDCTrustedSub(userInfo.sub, req.user.id, provider.id);
    }

    const params = new URLSearchParams({ tab: 'security', sub_created: 'true' });
    return res.redirect(`${reqURL.origin}/settings?${params}`);
  }

  @Get('/subs/trusted')
  @ApiResponse({ status: 200, type: TrustedSubsDto })
  @UseGuards(AuthGuard)
  async getTrustedSubs(@Req() req: ExpressRequest) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const trustedSubs = await this.oidcService.getTrustedSubsForUser(req.user.id);

    if (typeof trustedSubs === 'undefined') {
      throw new InternalServerErrorException();
    }

    return trustedSubs;
  }

  @Delete('/subs/:slug/delete')
  @UseGuards(AuthGuard)
  async deleteTrustedSub(@Param('slug') slug: string) {
    return await this.oidcService.deleteTrustedSub(slug);
  }
}
