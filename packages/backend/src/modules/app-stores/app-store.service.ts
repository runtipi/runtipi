import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import { RepoEventsQueue } from '../queue/entities/repo-events';
import { AppStoreRepository } from './app-store.repository';
import { ReposHelpers } from './repos.helpers';

@Injectable()
export class AppStoreService {
  constructor(
    private readonly logger: LoggerService,
    private readonly repoQueue: RepoEventsQueue,
    private readonly repoHelpers: ReposHelpers,
    private readonly config: ConfigurationService,
    private readonly appStoreRepository: AppStoreRepository,
  ) {
    this.repoQueue.onEvent(async (data) => {
      switch (data.command) {
        case 'update_all': {
          const stores = await this.appStoreRepository.getEnabledAppStores();
          for (const store of stores) {
            await this.repoHelpers.pullRepo(store.url, store.id.toString());
          }
          this.repoQueue.sendEventResponse(data.eventId, { success: true, message: 'All repos updated' });
          break;
        }
        case 'clone_all': {
          const stores = await this.appStoreRepository.getEnabledAppStores();
          for (const store of stores) {
            await this.repoHelpers.cloneRepo(store.url, store.id.toString());
          }
          this.repoQueue.sendEventResponse(data.eventId, { success: true, message: 'All repos cloned' });
          break;
        }
        case 'clone': {
          const { success, message } = await this.repoHelpers.cloneRepo(data.url, data.id);
          this.repoQueue.sendEventResponse(data.eventId, { success, message });
          break;
        }
        case 'update': {
          const { success, message } = await this.repoHelpers.pullRepo(data.url, data.id);
          this.repoQueue.sendEventResponse(data.eventId, { success, message });
          break;
        }
      }
    });
  }

  public async pullRepositories() {
    const repositories = await this.appStoreRepository.getEnabledAppStores();

    for (const repo of repositories) {
      await this.repoHelpers.pullRepo(repo.url, repo.id.toString());
    }

    return { success: true };
  }

  /**
   * Migrate the legacy repo to the new app store system
   *
   * @returns The ID of the migrated repo
   */
  public async migrateLegacyRepo() {
    const { deprecatedAppsRepoUrl } = this.config.getConfig();

    const existing = await this.appStoreRepository.getEnabledAppStores();

    if (existing.length) {
      this.logger.debug('Skipping repo migration, app stores already exist');
      return;
    }

    this.logger.info('Migrating default repo');

    const migrated = await this.appStoreRepository.createAppStore({ url: deprecatedAppsRepoUrl, name: 'migrated' });

    if (!migrated) {
      throw new Error('Failed to migrate current repo');
    }

    return migrated.id;
  }

  public async getEnabledAppStores() {
    return this.appStoreRepository.getEnabledAppStores();
  }

  public async getAllAppStores() {
    return this.appStoreRepository.getAllAppStores();
  }
}
