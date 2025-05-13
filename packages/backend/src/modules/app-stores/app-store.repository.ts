import { DatabaseService } from '@/core/database/database.service.js';
import { app, appStore } from '@/core/database/drizzle/schema.js';
import type { NewAppStore } from '@/core/database/drizzle/types.js';
import { Injectable } from '@nestjs/common';
import { and, asc, count, eq } from 'drizzle-orm';
import { ReposHelpers } from './repos.helpers.js';

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
   * Given a slug, return the app store associated to it
   */
  public async getAppStoreBySlug(slug: string) {
    return this.databaseService.db.query.appStore.findFirst({ where: eq(appStore.slug, slug) });
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
      .where(and(eq(appStore.enabled, true)))
      .orderBy(asc(appStore.hash));
  }

  public async getAllAppStores() {
    return this.databaseService.db.select().from(appStore).orderBy(asc(appStore.hash));
  }

  public async removeAppStoreEntity(slug: string) {
    return this.databaseService.db.delete(appStore).where(eq(appStore.slug, slug));
  }

  public async updateAppStoreHashAndUrl(slug: string, data: Pick<NewAppStore, 'hash' | 'url'>) {
    return this.databaseService.db.update(appStore).set({ hash: data.hash, url: data.url }).where(eq(appStore.slug, slug));
  }

  public async updateAppStore(slug: string, data: Omit<NewAppStore, 'hash' | 'slug' | 'url'>) {
    const update = await this.databaseService.db
      .update(appStore)
      .set({ name: data.name, enabled: data.enabled })
      .where(eq(appStore.slug, slug))
      .returning();
    const store = update[0];

    if (!store) {
      throw new Error('Failed to update app store.');
    }

    return store;
  }

  public async enableAppStore(slug: string) {
    return this.databaseService.db.update(appStore).set({ enabled: true }).where(eq(appStore.slug, slug));
  }

  public async disableAppStore(slug: string) {
    return this.databaseService.db.update(appStore).set({ enabled: false }).where(eq(appStore.slug, slug));
  }

  public async getAppCountForStore(slug: string) {
    const res = await this.databaseService.db.select({ count: count() }).from(app).where(eq(app.appStoreSlug, slug));
    return res[0];
  }
}
