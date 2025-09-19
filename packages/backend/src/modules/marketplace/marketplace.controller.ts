import { castAppUrn } from '@/common/helpers/app-helpers';
import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { AppStoreService } from '../app-stores/app-store.service';
import { AuthGuard } from '../auth/auth.guard';
import {
  AllAppStoresDto,
  AppStoreDto,
  CreateAppStoreBodyDto,
  PullDto,
  SearchAppsDto,
  SearchAppsQueryDto,
  UpdateAppStoreBodyDto,
  UpdateAppStoreDto,
} from './dto/marketplace.dto';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly appStoreService: AppStoreService,
  ) {}

  @Get('apps/search')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: SearchAppsDto })
  async searchApps(@Query() query: SearchAppsQueryDto) {
    const { search, pageSize, cursor, category, storeId } = query;

    const size = pageSize ? Number(pageSize) : 24;
    if (Number.isNaN(size) || size <= 0) {
      throw new BadRequestException('Invalid pageSize');
    }
    const res = await this.marketplaceService.searchApps({ search, pageSize: size, cursor, category, storeId });

    return SearchAppsDto.parse(res);
  }

  @Get('apps/:urn/image')
  async getImage(@Param('urn') urn: string, @Res() res: Response) {
    const image = await this.marketplaceService.getAppImage(castAppUrn(urn));

    if (!image) {
      throw new NotFoundException('App image not found');
    }

    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    });

    return res.send(image);
  }

  @Post('pull')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: PullDto })
  async pullAppStores() {
    const res = await this.appStoreService.pullRepositories();
    await this.marketplaceService.initialize();
    return PullDto.parse(res);
  }

  @Post('create')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: AppStoreDto })
  async createAppStore(@Body() body: CreateAppStoreBodyDto) {
    const appStore = await this.appStoreService.createAppStore(body);
    await this.marketplaceService.initialize();

    return AppStoreDto.parse(appStore);
  }

  @Get('all')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: AllAppStoresDto })
  async getAllAppStores() {
    const appStores = await this.appStoreService.getAllAppStores();

    return AllAppStoresDto.parse({ appStores });
  }

  @Get('enabled')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: AllAppStoresDto })
  async getEnabledAppStores() {
    const appStores = await this.appStoreService.getEnabledAppStores();

    return AllAppStoresDto.parse({ appStores });
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: UpdateAppStoreDto })
  async updateAppStore(@Param('id') id: string, @Body() body: UpdateAppStoreBodyDto) {
    await this.appStoreService.updateAppStore(id, body);
    await this.marketplaceService.initialize();

    return UpdateAppStoreDto.parse({ success: true });
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteAppStore(@Param('id') id: string) {
    await this.appStoreService.deleteAppStore(id);
    await this.marketplaceService.initialize();

    return { success: true };
  }
}
