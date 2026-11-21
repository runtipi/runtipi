import { InstanceService } from './instance.service';
import { UserModule } from '../user/user.module';
import { GithubModule } from '@/utils/github/github.module';
import { Module } from '@nestjs/common';
import { DockerModule } from '../docker/docker.module';
import { SystemController } from './system.controller';
import { HostMemoryService } from './host-memory.service';
import { SystemService } from './system.service';

@Module({
  imports: [DockerModule, UserModule, GithubModule],
  controllers: [SystemController],
  providers: [SystemService, HostMemoryService, InstanceService],
  exports: [SystemService, InstanceService],
})
export class SystemModule {}
