import { SocketModule } from '@/core/socket/socket.module';
import { Module } from '@nestjs/common';
import { AppStoreModule } from '../app-stores/app-store.module';
import { AppsModule } from '../apps/apps.module';
import { DockerComposeBuilder } from './builders/compose.builder';
import { DockerService } from './docker.service';

@Module({
  imports: [AppsModule, AppStoreModule, SocketModule],
  providers: [DockerService, DockerComposeBuilder],
  exports: [DockerService],
})
export class DockerModule {}
