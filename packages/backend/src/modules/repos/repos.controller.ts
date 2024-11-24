import { Controller, Post, UseGuards } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { PullDto } from './dto/repos.dto';
import { ReposService } from './repos.service';

@UseGuards(AuthGuard)
@Controller('repos')
export class ReposController {
  constructor(private readonly reposService: ReposService) {}

  @Post('/pull')
  @ZodSerializerDto(PullDto)
  async pull(): Promise<PullDto> {
    return this.reposService.pullRepositories();
  }
}

