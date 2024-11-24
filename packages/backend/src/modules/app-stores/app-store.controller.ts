import { Controller, Post, UseGuards } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { AppStoreService } from './app-store.service';
import { PullDto } from './dto/app-store.dto';

@UseGuards(AuthGuard)
@Controller('repos')
export class AppStoreController {
  constructor(private readonly appStoreService: AppStoreService) {}

  @Post('/pull')
  @ZodSerializerDto(PullDto)
  async pull(): Promise<PullDto> {
    return this.appStoreService.pullRepositories();
  }
}
