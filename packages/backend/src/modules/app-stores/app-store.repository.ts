import { ConfigurationService } from '@/core/config/configuration.service';
import { DatabaseService } from '@/core/database/database.service';
import { appStore } from '@/core/database/drizzle/schema';
import type { NewAppStore } from '@/core/database/drizzle/types';
import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { ReposHelpers } from './repos.helpers';

@Injectable()
export class AppStoreRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly repoHelpers: ReposHelpers,
    private readonly config: ConfigurationService,
  ) {}

  /**
   * Given a hash, return the app store associated to it
   */
  public async getAppStoreByHash(hash: string) {
    return this.databaseService.db.query.appStore.findFirst({ where: eq(appStore.hash, hash) });
  }

  /**
   * Given appstore data, creates a appstore
   */
  public async createAppStore(data: Omit<NewAppStore, 'hash'>) {
    const hash = this.repoHelpers.getRepoHash(data.url);

    const newAppStore = await this.databaseService.db
      .insert(appStore)
      .values({ ...data, hash })
      .returning();
    return newAppStore[0];
  }

  public async getEnabledAppStores() {
    return this.databaseService.db.query.appStore.findMany({ where: and(eq(appStore.enabled, true), eq(appStore.deleted, false)) });
  }

  public async getAllAppStores() {
    return this.databaseService.db.query.appStore.findMany({ where: eq(appStore.deleted, false) });
  }

  public async deleteAppStore(id: number) {
    return this.databaseService.db.update(appStore).set({ deleted: true }).where(eq(appStore.id, id));
  }

  public async updateAppStore(id: number, data: Omit<NewAppStore, 'hash' | 'id' | 'url'>) {
    return this.databaseService.db.update(appStore).set({ name: data.name, enabled: data.enabled, deleted: false }).where(eq(appStore.id, id));
  }

  public async enableAppStore(id: number) {
    return this.databaseService.db.update(appStore).set({ enabled: true }).where(eq(appStore.id, id));
  }

  public async disableAppStore(id: number) {
    return this.databaseService.db.update(appStore).set({ enabled: false }).where(eq(appStore.id, id));
  }
}
