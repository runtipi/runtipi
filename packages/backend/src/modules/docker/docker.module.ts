import { Module } from '@nestjs/common';
import Dockerode from 'dockerode';
import { AppStoreModule } from '../app-stores/app-store.module';
import { AppsModule } from '../apps/apps.module';
import { DockerService } from './docker.service';
import { DOCKERODE } from './docker.constants';

@Module({
  imports: [AppsModule, AppStoreModule],
  providers: [
    DockerService,
    {
      provide: DOCKERODE,
      useFactory: (): Dockerode => new Dockerode(),
      inject: [],
    },
  ],
  exports: [DockerService, DOCKERODE],
})
export class DockerModule {}
