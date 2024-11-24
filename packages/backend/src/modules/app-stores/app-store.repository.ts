import { DatabaseService } from '@/core/database/database.service';
import { appStore } from '@/core/database/drizzle/schema';
import type { NewAppStore } from '@/core/database/drizzle/types';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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
    return newAppStore[0];
  }

  public async getAppStores() {
    return this.databaseService.db.query.appStore.findMany({ where: eq(appStore.enabled, true) });
  }
}
