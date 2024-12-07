import { DatabaseService } from '@/core/database/database.service';
import { app, appStore } from '@/core/database/drizzle/schema';
import type { NewAppStore } from '@/core/database/drizzle/types';
import { Injectable } from '@nestjs/common';
import { and, asc, count, eq } from 'drizzle-orm';
import { ReposHelpers } from './repos.helpers';

@Injectable()
export class AppStoreRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly repoHelpers: ReposHelpers,
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

    const insertedAppStore = newAppStore[0];
    if (!insertedAppStore) {
      throw new Error('Failed to create new app store.');
    }

    return insertedAppStore;
  }

  public async getEnabledAppStores() {
    return this.databaseService.db
      .select()
      .from(appStore)
      .where(and(eq(appStore.enabled, true), eq(appStore.deleted, false)))
      .orderBy(asc(appStore.hash));
  }

  public async getAllAppStores() {
    return this.databaseService.db.select().from(appStore).where(eq(appStore.deleted, false)).orderBy(asc(appStore.hash));
  }

  public async removeAppStoreEntity(id: number) {
    return this.databaseService.db.delete(appStore).where(eq(appStore.id, id));
  }

  public async deleteAppStore(id: number) {
    return this.databaseService.db.update(appStore).set({ deleted: true }).where(eq(appStore.id, id));
  }

  public async updateAppStore(id: number, data: Omit<NewAppStore, 'hash' | 'id' | 'url'>) {
    const update = await this.databaseService.db
      .update(appStore)
      .set({ name: data.name, enabled: data.enabled, deleted: false })
      .where(eq(appStore.id, id))
      .returning();
    const store = update[0];

    if (!store) {
      throw new Error('Failed to update app store.');
    }

    return store;
  }

  public async enableAppStore(id: number) {
    return this.databaseService.db.update(appStore).set({ enabled: true }).where(eq(appStore.id, id));
  }

  public async disableAppStore(id: number) {
    return this.databaseService.db.update(appStore).set({ enabled: false }).where(eq(appStore.id, id));
  }

  public async getAppCountForStore(id: number) {
    const res = await this.databaseService.db.select({ count: count() }).from(app).where(eq(app.appStoreId, id));
    return res[0];
  }
}
