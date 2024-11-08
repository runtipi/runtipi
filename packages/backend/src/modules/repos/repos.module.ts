import { Module } from '@nestjs/common';
import { ReposService } from './repos.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  controllers: [],
  providers: [ReposService],
  exports: [ReposService],
})
export class ReposModule { }
