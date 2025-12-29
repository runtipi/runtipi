import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AppEventsQueue } from './entities/app-events';
import { RepoEventsQueue } from './entities/repo-events';
import { ApiResponse } from '@nestjs/swagger';
import { EventsDto } from './dto/queue.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('queue')
export class QueueController {
  constructor(
    private readonly appEventsQueue: AppEventsQueue,
    private readonly repoEventsQueue: RepoEventsQueue,
  ) {}

  @Get('/events/app-events')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: EventsDto })
  async getAppEvents() {
    const events = this.appEventsQueue.getEvents();
    return EventsDto.parse(events, { reportOnly: true });
  }

  @Get('/events/repo-events')
  @UseGuards(AuthGuard)
  @ApiResponse({ type: EventsDto })
  async getRepoEvents() {
    const events = this.repoEventsQueue.getEvents();
    return EventsDto.parse(events, { reportOnly: true });
  }

  @Post('/events/app-events/cancel/:requestId')
  @UseGuards(AuthGuard)
  async cancelAppEvent(@Param('requestId') requestId: string) {
    await this.appEventsQueue.cancelEvent(requestId);
    return { message: `Cancellation requested for app event with requestId: ${requestId}` };
  }

  @Post('/events/repo-events/cancel/:requestId')
  @UseGuards(AuthGuard)
  async cancelRepoEvent(@Param('requestId') requestId: string) {
    await this.repoEventsQueue.cancelEvent(requestId);
    return { message: `Cancellation requested for repo event with requestId: ${requestId}` };
  }
}
