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
    this.repoQueue.onEvent(async ({ eventId, command, url }) => {
      switch (command) {
        case 'update_all': {
          const stores = await this.appStoreRepository.getAppStores();
          for (const store of stores) {
            await this.repoHelpers.pullRepo(store.url);
          }
          break;
        }
        case 'clone': {
          const { success, message } = await this.repoHelpers.cloneRepo(url);
          this.repoQueue.sendEventResponse(eventId, { success, message });
          break;
        }
        case 'update': {
          const { success, message } = await this.repoHelpers.pullRepo(url);
          this.repoQueue.sendEventResponse(eventId, { success, message });
          break;
        }
        default:
          this.logger.error(`Unknown command: ${command}`);
      }
    });
  }

  public async pullRepositories() {
    const repositories = await this.appStoreRepository.getAppStores();

    for (const repo of repositories) {
      await this.repoHelpers.pullRepo(repo.url);
    }

    return { success: true };
  }

  public async migrateLegacyRepo() {
    const { appsRepoId, appsRepoUrl } = this.config.getConfig();

    const existing = await this.appStoreRepository.getAppStores();

    if (existing.length) {
      this.logger.info('Skipping migration, app stores already exist');
      return;
    }

    this.logger.info('Migrating default repo');

    let migrated = await this.appStoreRepository.getAppStoreByHash(appsRepoId);
    if (!migrated) {
      migrated = await this.appStoreRepository.createAppStore({ url: appsRepoUrl, name: 'migrated' });
    }

    if (!migrated) {
      throw new Error('Failed to migrate current repo');
    }

    return migrated.id;
  }

  public async getAppStores() {
    return this.appStoreRepository.getAppStores();
  }
}
