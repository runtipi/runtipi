import { Module } from '@nestjs/common';
import { AppsModule } from '../apps/apps.module';
import { ReposModule } from '../repos/repos.module';
import { DockerService } from './docker.service';

@Module({
  imports: [AppsModule, AppStoreModule],
  providers: [DockerService],
  exports: [DockerService],
})
export class DockerModule {}
