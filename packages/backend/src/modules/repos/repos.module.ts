import { Module } from '@nestjs/common';
import { ReposService } from './repos.service';
import { QueueModule } from '../queue/queue.module';
import { ReposController } from './repos.controller';

@Module({
  imports: [QueueModule],
  controllers: [ReposController],
  providers: [ReposService],
  exports: [ReposService],
})
export class ReposModule { }
