import fs from 'node:fs';
import os from 'node:os';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import type Dockerode from 'dockerode';
import { AppsRepository } from '../apps/apps.repository';
import { DOCKERODE } from '../docker/docker.module';
import { DockerService } from '../docker/docker.service';
import { AppDiskUsage, type DockerDiskUsage, measureDirectory } from './metrics/app-disk-usage';
import { type Mount, parseComposeStorage } from './metrics/disk-attribution';

// Measuring app data walks whole directory trees, so it runs rarely and starts after boot settled
export const DISK_USAGE_INTERVAL_MS = 15 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 30 * 1000;

@Injectable()
export class AppDiskUsageService implements OnModuleInit, OnModuleDestroy {
  private timers: NodeJS.Timeout[] = [];
  private readonly usage: AppDiskUsage;

  constructor(
    private readonly logger: LoggerService,
    private readonly config: ConfigurationService,
    private readonly appsRepository: AppsRepository,
    private readonly dockerService: DockerService,
    @Inject(DOCKERODE) private readonly docker: Dockerode,
  ) {
    this.usage = new AppDiskUsage({
      listApps: async () => (await this.appsRepository.getApps()).map((app) => `${app.appName}:${app.appStoreSlug}`),
      getAppStorage: (urn) => this.getAppStorage(urn),
      getDockerDiskUsage: () => this.getDockerDiskUsage(),
      getOwnMounts: () => this.getOwnMounts(),
      measure: measureDirectory,
    });
  }

  onModuleInit() {
    const first = setTimeout(() => void this.refresh(), FIRST_RUN_DELAY_MS);
    const interval = setInterval(() => void this.refresh(), DISK_USAGE_INTERVAL_MS);
    first.unref?.();
    interval.unref?.();
    this.timers = [first, interval];
  }

  onModuleDestroy() {
    for (const timer of this.timers) clearTimeout(timer);
  }

  public get() {
    return this.usage.get();
  }

  public refresh() {
    return this.usage.refresh().catch((e) => this.logger.error('Unable to compute app disk usage:', e));
  }

  private async getAppStorage(urn: string) {
    try {
      const config = await this.dockerService.getAppComposeConfig(urn as AppUrn);
      return parseComposeStorage(config as Parameters<typeof parseComposeStorage>[0], this.config.get('rootFolderHost'));
    } catch (e) {
      this.logger.debug(`Unable to read compose config of ${urn}:`, e);
      return null;
    }
  }

  private async getDockerDiskUsage() {
    try {
      return (await this.docker.df()) as DockerDiskUsage;
    } catch (e) {
      this.logger.debug('Unable to read docker disk usage:', e);
      return null;
    }
  }

  /**
   * Host paths are only readable through the volumes mounted into the runtipi container.
   */
  private async getOwnMounts(): Promise<Mount[] | null> {
    if (!fs.existsSync('/.dockerenv')) return null;

    for (const id of [os.hostname(), 'runtipi']) {
      try {
        const { Mounts } = await this.docker.getContainer(id).inspect();
        return Mounts.filter((mount) => mount.Type === 'bind').map((mount) => ({ source: mount.Source, destination: mount.Destination }));
      } catch {
        // try the next candidate
      }
    }

    this.logger.warn('Unable to find the runtipi container, app data sizes will not be measured');
    return [];
  }
}
