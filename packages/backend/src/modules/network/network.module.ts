import { Module } from '@nestjs/common';
import { AppsModule } from '../apps/apps.module';
import { DockerModule } from '../docker/docker.module';
import { SubnetManagerService } from './subnet-manager.service';

@Module({
  imports: [AppsModule, DockerModule],
  controllers: [],
  providers: [SubnetManagerService],
  exports: [SubnetManagerService],
})
export class NetworkModule {}
