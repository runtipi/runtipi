import { LoggerService } from '@/core/logger/logger.service';
import { SSEService } from '@/core/sse/sse.service';
import { Inject, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import * as Sentry from '@sentry/nestjs';
import type Dockerode from 'dockerode';
import { DOCKERODE } from '../docker/docker.module';
import { AppsRepository } from '../apps/apps.repository';
import type { AppStatus } from '@/core/database/drizzle/types';
import { SystemEventsQueue } from '../queue/entities/system-events';
import { ConfigurationService } from '@/core/config/configuration.service';

const TRANSITIONAL_STATES: AppStatus[] = [
  'installing',
  'uninstalling',
  'stopping',
  'starting',
  'updating',
  'resetting',
  'restarting',
  'backing_up',
  'restoring',
];

@Injectable()
export class AppStatusSyncService {
  constructor(
    private readonly logger: LoggerService,
    private readonly appRepository: AppsRepository,
    private readonly sseService: SSEService,
    private readonly systemEventsQueue: SystemEventsQueue,
    private readonly configuration: ConfigurationService,
    @Inject(DOCKERODE) private readonly docker: Dockerode,
  ) {
    if (this.configuration.get('userSettings').eventsTimeout > 5) {
      this.logger.warn(
        `You have set a high events timeout of ${this.configuration.get('userSettings').eventsTimeout} minutes. Consider lowering if app status syncs are not occurring as expected.`,
      );
    }

    this.systemEventsQueue.onEvent(async (data, reply) => {
      if (data.command === 'sync_app_statuses') {
        const result = await this.syncAllAppStatuses();
        await reply(result);
      }
    });
  }

  async syncAllAppStatuses() {
    try {
      this.logger.debug('Starting app status sync');

      const apps = await this.appRepository.getApps();
      const containers = await this.docker.listContainers({
        all: true,
        filters: { label: ['runtipi.managed=true'] },
      });

      const dockerStatusMap = new Map<string, { running: number; total: number }>();

      for (const container of containers) {
        const appUrn = container.Labels?.['runtipi.appurn'];
        if (!appUrn) continue;

        if (!dockerStatusMap.has(appUrn)) {
          dockerStatusMap.set(appUrn, { running: 0, total: 0 });
        }

        const status = dockerStatusMap.get(appUrn);
        if (status) {
          status.total++;
          if (container.State === 'running') status.running++;
        }
      }

      let syncedCount = 0;
      let skippedCount = 0;

      for (const app of apps) {
        const appUrn: AppUrn = `${app.appName}:${app.appStoreSlug}` as AppUrn;

        const isTransitional = TRANSITIONAL_STATES.includes(app.status);
        if (isTransitional) {
          const timeSinceUpdate = Date.now() - new Date(app.updatedAt).getTime();
          if (timeSinceUpdate < this.configuration.get('userSettings').eventsTimeout * 60 * 1000) {
            this.logger.debug(`Skipping ${appUrn} - in recent transitional state '${app.status}'`);
            skippedCount++;
            continue;
          }
          this.logger.warn(`App ${appUrn} stuck in '${app.status}' for ${Math.round(timeSinceUpdate / 60000)} minutes`);
        }

        const dockerStatus = dockerStatusMap.get(appUrn);
        let newStatus: AppStatus;

        if (!dockerStatus || dockerStatus.total === 0) {
          newStatus = 'missing';
        } else if (dockerStatus.running === dockerStatus.total) {
          newStatus = 'running';
        } else {
          newStatus = 'stopped';
          if (dockerStatus.running > 0) {
            this.logger.warn(`App ${appUrn} has mixed container states: ${dockerStatus.running}/${dockerStatus.total} running`);
          }
        }

        if (app.status !== newStatus) {
          await this.appRepository.updateAppById(app.id, { status: newStatus });
          this.sseService.emit('app', { event: 'status_change', appUrn, appStatus: newStatus });
          this.logger.info(`Synced ${appUrn}: '${app.status}' -> '${newStatus}'`);
          syncedCount++;
        }
      }

      this.logger.debug(`App status sync completed: ${syncedCount} synced, ${skippedCount} skipped`);

      return {
        success: true,
        message: `Synced ${syncedCount} apps`,
        syncedCount,
        skippedCount,
        totalApps: apps.length,
      };
    } catch (error) {
      this.logger.error('Error during app status sync:', error);
      Sentry.captureException(error, { tags: { source: 'app-status-sync' } });

      return {
        success: false,
        message: `Error during sync: ${String(error)}`,
        syncedCount: 0,
        skippedCount: 0,
        totalApps: 0,
      };
    }
  }
}
