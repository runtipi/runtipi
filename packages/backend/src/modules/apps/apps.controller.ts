import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { AppCatalogService } from './app-catalog.service';
import { APP_CATEGORIES } from './dto/app-info.dto';
import { AppDetailsDto, GuestAppsDto, MyAppsDto, SearchAppsDto, SearchAppsQueryDto } from './dto/app.dto';

@Controller('apps')
export class AppsController {
  constructor(private readonly appCatalog: AppCatalogService) {}

  @Get('installed')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(MyAppsDto)
  async getInstalledApps(): Promise<MyAppsDto> {
    const installed = await this.appCatalog.getInstalledApps();
    return { installed };
  }

  @Get('guest')
  @ZodSerializerDto(GuestAppsDto)
  async getGuestApps(): Promise<GuestAppsDto> {
    const guest = await this.appCatalog.getGuestDashboardApps();
    return { installed: guest };
  }

  @Get('search')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(SearchAppsDto)
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'pageSize', type: Number, required: false })
  @ApiQuery({ name: 'cursor', type: String, required: false })
  @ApiQuery({ name: 'category', required: false, enum: APP_CATEGORIES })
  async searchApps(@Query() query: SearchAppsQueryDto): Promise<SearchAppsDto> {
    const { search, pageSize, cursor, category } = query;

    const res = await this.appCatalog.searchApps({ search, pageSize: Number(pageSize), cursor, category });

    return res;
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ZodSerializerDto(AppDetailsDto)
  async getAppDetails(@Param('id') id: string): Promise<AppDetailsDto> {
    const res = await this.appCatalog.getApp(id);

    return res;
  }

  @Get(':id/image')
  async getImage(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const image = await this.appCatalog.getAppImage(id);

    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    });

    return res.send(image);
  }
}
