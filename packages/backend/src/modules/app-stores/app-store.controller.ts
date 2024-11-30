import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { AppStoreService } from './app-store.service';
import { AllAppStoresDto, PullDto } from './dto/app-store.dto';

@UseGuards(AuthGuard)
@Controller('app-store')
export class AppStoreController {
  constructor(private readonly appStoreService: AppStoreService) {}

  @Post('/pull')
  @ZodSerializerDto(PullDto)
  async pullAppStore(): Promise<PullDto> {
    return this.appStoreService.pullRepositories();
  }

  @Get('/all')
  @ZodSerializerDto(AllAppStoresDto)
  async getAllAppStores(): Promise<AllAppStoresDto> {
    const appStores = await this.appStoreService.getEnabledAppStores();

    return { appStores };
  }
}
