import { Module } from '@nestjs/common';
import Dockerode from 'dockerode';
import { AppStoreModule } from '../app-stores/app-store.module.js';
import { AppsModule } from '../apps/apps.module.js';
import { DockerService } from './docker.service.js';

export const DOCKERODE = 'DOCKERODE_INSTANCE';

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
