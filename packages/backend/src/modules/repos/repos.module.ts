import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { ReposController } from './repos.controller';
import { ReposHelpers } from './repos.helpers';
import { ReposService } from './repos.service';

@Module({
  imports: [QueueModule],
  controllers: [ReposController],
  providers: [ReposService, ReposHelpers],
  exports: [ReposService, ReposHelpers],
})
export class ReposModule {}
