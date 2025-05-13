import { Module } from '@nestjs/common';
import { AppsModule } from '../apps/apps.module.js';
import { DockerModule } from '../docker/docker.module.js';
import { SubnetManagerService } from './subnet-manager.service.js';

@Module({
  imports: [AppsModule, DockerModule],
  controllers: [],
  providers: [SubnetManagerService],
  exports: [SubnetManagerService],
})
export class NetworkModule {}
