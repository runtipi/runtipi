import { ConfigurationService } from '@/core/config/configuration.service';
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
      useFactory: (queueFactory: QueueFactory, config: ConfigurationService) => {
        const timeout = config.get('userSettings').eventsTimeout * 60 * 1000;

        return queueFactory.createQueue({
          queueName: 'app-events-queue',
          workers: 1,
          eventSchema: appEventSchema,
          resultSchema: appEventResultSchema,
          timeout: timeout,
        });
      },
      inject: [QueueFactory, ConfigurationService],
    },
    {
      provide: RepoEventsQueue,
      useFactory: (queueFactory: QueueFactory, config: ConfigurationService) => {
        const timeout = config.get('userSettings').eventsTimeout * 60 * 1000;

        return queueFactory.createQueue({
          queueName: 'repo-queue',
          workers: 3,
          eventSchema: repoCommandSchema,
          resultSchema: repoCommandResultSchema,
          timeout: timeout,
        });
      },
      inject: [QueueFactory, ConfigurationService],
    },
  ],
  exports: [AppEventsQueue, RepoEventsQueue, QueueHealthIndicator],
})
export class QueueModule {}
