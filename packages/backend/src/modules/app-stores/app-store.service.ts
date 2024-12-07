import { TranslatableError } from '@/common/error/translatable-error';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { UpdateAppStoreBodyDto } from '../marketplace/dto/marketplace.dto';
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
    this.repoQueue.onEvent(async (data, reply) => {
      switch (data.command) {
        case 'update_all': {
          const stores = await this.appStoreRepository.getEnabledAppStores();
          for (const store of stores) {
            await this.repoHelpers.pullRepo(store.url, store.id.toString());
          }
          reply({ success: true, message: 'All repos updated' });
          break;
        }
        case 'clone_all': {
          const stores = await this.appStoreRepository.getEnabledAppStores();
          for (const store of stores) {
            await this.repoHelpers.cloneRepo(store.url, store.id.toString());
          }
          reply({ success: true, message: 'All repos cloned' });
          break;
        }
        case 'clone': {
          const { success, message } = await this.repoHelpers.cloneRepo(data.url, data.id);
          reply({ success, message });
          break;
        }
        case 'update': {
          const { success, message } = await this.repoHelpers.pullRepo(data.url, data.id);
          reply({ success, message });
          break;
        }
      }
    });
  }

  public async pullRepositories() {
    const repositories = await this.appStoreRepository.getEnabledAppStores();

    for (const repo of repositories) {
      this.logger.debug(`Pulling repo ${repo.url}`);
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

    const existing = await this.appStoreRepository.getAllAppStores();

    if (existing.length) {
      this.logger.debug('Skipping repo migration, app stores already exist');
      return;
    }

    this.logger.info('Migrating default repo');

    const migrated = await this.appStoreRepository.createAppStore({ url: deprecatedAppsRepoUrl.trim().toLowerCase(), name: 'migrated' });

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

  /**
   * Given an app store ID and the new data, update the app store in the database
   *
   * @param id The ID of the app store to update
   * @param body The new data to update the app store with
   */
  public async updateAppStore(id: string, body: UpdateAppStoreBodyDto) {
    return this.appStoreRepository.updateAppStore(Number(id), body);
  }

  /**
   * Given an app store ID, delete it from the database and the filesystem
   *
   * @param id The ID of the app store to delete
   */
  public async deleteAppStore(id: string) {
    const stores = await this.appStoreRepository.getAllAppStores();

    if (stores.length === 1) {
      throw new TranslatableError('APP_STORE_DELETE_ERROR_LAST_STORE', {}, HttpStatus.BAD_REQUEST);
    }

    const count = await this.appStoreRepository.getAppCountForStore(Number(id));

    if (count && count.count > 0) {
      throw new TranslatableError('APP_STORE_DELETE_ERROR_APPS_EXIST', {}, HttpStatus.BAD_REQUEST);
    }

    await this.appStoreRepository.deleteAppStore(Number(id));
    await this.repoHelpers.deleteRepo(id);

    return { success: true };
  }

  public async createAppStore(body: { url: string; name: string }) {
    if (this.config.get('demoMode')) {
      throw new TranslatableError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    }

    const hash = this.repoHelpers.getRepoHash(body.url);
    const existing = await this.appStoreRepository.getAppStoreByHash(hash);

    if (existing && !existing.deleted) {
      throw new TranslatableError('SERVER_ERROR_APP_STORE_ALREADY_EXISTS', {}, HttpStatus.CONFLICT);
    }

    if (existing?.deleted) {
      const { success } = await this.repoHelpers.cloneRepo(body.url, existing.id.toString());

      if (!success) {
        throw new TranslatableError('APP_STORE_CLONE_ERROR', { url: body.url }, HttpStatus.BAD_REQUEST);
      }

      return this.appStoreRepository.updateAppStore(existing.id, { name: body.name, enabled: true });
    }

    const created = await this.appStoreRepository.createAppStore(body);
    const { success } = await this.repoHelpers.cloneRepo(body.url, created.id.toString());

    if (!success) {
      await this.appStoreRepository.removeAppStoreEntity(created.id);
      throw new TranslatableError('APP_STORE_CLONE_ERROR', { url: body.url }, HttpStatus.BAD_REQUEST);
    }

    return created;
  }

  public async getAppCountForStore(id: string) {
    return this.appStoreRepository.getAppCountForStore(Number(id));
  }

  public async deleteAllRepos() {
    await this.repoHelpers.deleteAllRepos();
  }
}
