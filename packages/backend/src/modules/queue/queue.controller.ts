import { Controller, Get, Param, Post } from '@nestjs/common';
import { AppEventsQueue } from './entities/app-events';
import { RepoEventsQueue } from './entities/repo-events';

@Controller('queue')
export class QueueController {
  constructor(
    private readonly appEventsQueue: AppEventsQueue,
    private readonly repoEventsQueue: RepoEventsQueue,
  ) {}

  @Get('/events/app-events')
  async getAppEvents() {
    return this.appEventsQueue.getEvents();
  }

  @Get('/events/repo-events')
  async getRepoEvents() {
    return this.repoEventsQueue.getEvents();
  }

  @Post('/events/app-events/cancel/:requestId')
  async cancelAppEvent(@Param('requestId') requestId: string) {
    await this.appEventsQueue.cancelEvent(requestId);
    return { message: `Cancellation requested for app event with requestId: ${requestId}` };
  }

  @Post('/events/repo-events/cancel/:requestId')
  async cancelRepoEvent(@Param('requestId') requestId: string) {
    await this.repoEventsQueue.cancelEvent(requestId);
    return { message: `Cancellation requested for repo event with requestId: ${requestId}` };
  }
}
