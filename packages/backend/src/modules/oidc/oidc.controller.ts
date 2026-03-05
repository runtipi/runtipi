import { Controller, Get, Injectable, Post, UseGuards, Body, Patch, Param, Delete, Req, Query } from '@nestjs/common';
import { OidcService } from './oidc.service';
import { ApiResponse } from '@nestjs/swagger';
import { OidcProviderAuthResDto, OidcProviderDto, OidcProvidersDto, PublicOidcProvidersDto } from './dto/oidc.dto';
import { AuthGuard } from '../auth/auth.guard';

@Injectable()
@Controller('oidc')
export class OidcController {
  constructor(private readonly oidcService: OidcService) {}

  @Get('providers/public')
  @ApiResponse({ type: PublicOidcProvidersDto })
  async getProvidersPublic() {
    return await this.oidcService.getOidcProvidersPublic();
  }

  @Get('providers/private')
  @ApiResponse({ type: OidcProvidersDto })
  @UseGuards(AuthGuard)
  async getProvidersPrivate() {
    return await this.oidcService.getOidcProviders();
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

  @Get('providers/:id/auth')
  @ApiResponse({ type: OidcProviderAuthResDto })
  async getProviderAuthUrl(@Param('id') id: number, @Req() req: Request) {
    const url = new URL(req.url);
    return await this.oidcService.getProviderAuthUrl(id, url.origin);
  }

  @Get('providers/:id/callback')
  async handleCallback(@Param('id') _id: number, @Query() query: { client_id: string; code: string; state: string }, @Req() req: Request) {
    const url = new URL(req.url);
    return await this.oidcService.handleCallback(query.client_id, query.code, query.state, url.origin);
  }
}
