import { ConfigurationService } from '@/core/config/configuration.service';
import { Controller, Post, UseGuards } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { PullDto } from './dto/repos.dto';
import { ReposService } from './repos.service';

@UseGuards(AuthGuard)
@Controller('repos')
export class ReposController {
  constructor(
    private readonly repoService: ReposService,
    private readonly config: ConfigurationService,
  ) {}

  @Post('/pull')
  @ZodSerializerDto(PullDto)
  async PullRepo(): Promise<PullDto> {
    const appsRepoUrl = await this.config.get('appsRepoUrl');
    const res = await this.repoService.pullRepo(appsRepoUrl);
    return res;
  }
}
