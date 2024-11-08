import { Module } from '@nestjs/common';
import { AppEventsQueue, appEventResultSchema, appEventSchema } from './entities/app-events';
import { RepoEventsQueue, repoCommandResultSchema, repoCommandSchema } from './entities/repo-events';
import { QueueFactory } from './queue.factory';
import { QueueHealthIndicator } from './queue.health';

@Module({
  imports: [],
  providers: [
    QueueHealthIndicator,
    QueueFactory,
    {
      provide: AppEventsQueue,
      useFactory: (queueFactory: QueueFactory) =>
        queueFactory.createQueue({
          queueName: 'app-events-queue',
          workers: 1,
          eventSchema: appEventSchema,
          resultSchema: appEventResultSchema,
        }),
      inject: [QueueFactory],
    },
    {
      provide: RepoEventsQueue,
      useFactory: (queueFactory: QueueFactory) =>
        queueFactory.createQueue({
          queueName: 'repo-queue',
          workers: 3,
          eventSchema: repoCommandSchema,
          resultSchema: repoCommandResultSchema,
        }),
      inject: [QueueFactory],
    },
  ],
  exports: [AppEventsQueue, RepoEventsQueue, QueueHealthIndicator],
})
export class QueueModule {}
