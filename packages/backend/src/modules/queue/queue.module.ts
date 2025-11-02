import { ConfigurationService } from '@/core/config/configuration.service';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AppEventsQueue, appEventSchema } from './entities/app-events';
import { RepoEventsQueue, repoCommandSchema } from './entities/repo-events';
import { SystemEventsQueue, systemCommandSchema } from './entities/system-events';
import { QueueFactory } from './queue.factory';
import { QueueHealthIndicator } from './queue.health';

@Module({
  imports: [TerminusModule],
  providers: [
    QueueHealthIndicator,
    QueueFactory,
    {
      provide: AppEventsQueue,
      useFactory: async (queueFactory: QueueFactory, config: ConfigurationService) => {
        const timeout = config.get('userSettings').eventsTimeout * 60 * 1000;

        return await queueFactory.createQueue({
          queueName: 'app-events-queue',
          workers: 3,
          eventSchema: appEventSchema,
          timeout: timeout,
        });
      },
      inject: [QueueFactory, ConfigurationService],
    },
    {
      provide: RepoEventsQueue,
      useFactory: async (queueFactory: QueueFactory, config: ConfigurationService) => {
        const timeout = config.get('userSettings').eventsTimeout * 60 * 1000;

        return await queueFactory.createQueue({
          queueName: 'repo-queue',
          workers: 3,
          eventSchema: repoCommandSchema,
          timeout: timeout,
        });
      },
      inject: [QueueFactory, ConfigurationService],
    },
    {
      provide: SystemEventsQueue,
      useFactory: async (queueFactory: QueueFactory, config: ConfigurationService) => {
        const timeout = config.get('userSettings').eventsTimeout * 60 * 1000;

        return await queueFactory.createQueue({
          queueName: 'system-events-queue',
          workers: 1,
          eventSchema: systemCommandSchema,
          timeout: timeout,
        });
      },
      inject: [QueueFactory, ConfigurationService],
    },
  ],
  exports: [AppEventsQueue, RepoEventsQueue, SystemEventsQueue, QueueHealthIndicator],
})
export class QueueModule {}
