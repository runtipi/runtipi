import { DatabaseService } from '@/core/database/database.service';
import { app, appStore } from '@/core/database/drizzle/schema';
import type { AppStatus, NewApp } from '@/core/database/drizzle/types';
import { Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, ne, notInArray } from 'drizzle-orm';

@Injectable()
export class AppsRepository {
  constructor(private db: DatabaseService) {}

  /**
   * Given an app id, return the app
   *
   * @param {string} appId - The id of the app to return
   */
  public async getApp(appId: string) {
    return this.db.db.query.app.findFirst({ where: eq(app.id, appId) });
  }

  public async getAppWithAppStore(appId: string) {
    const foundApp = await this.db.db.select().from(app).where(eq(app.id, appId)).innerJoin(appStore, eq(app.appStoreId, appStore.id)).execute();
    return foundApp[0];
  }

  /**
   * Given an app id, update the app with the given data
   *
   * @param {string} appId - The id of the app to update
   * @param {Partial<NewApp>} data - The data to update the app with
   */
  public async updateApp(appId: string, data: Partial<NewApp>) {
    const updatedApps = await this.db.db.update(app).set(data).where(eq(app.id, appId)).returning().execute();
    return updatedApps[0];
  }

  /**
   * Given an app id, delete the app
   *
   * @param {string} appId - The id of the app to delete
   */
  public async deleteApp(appId: string) {
    await this.db.db.delete(app).where(eq(app.id, appId)).execute();
  }

  /**
   * Given app data, creates a new app
   *
   * @param {NewApp} data - The data to create the app with
   */
  public async createApp(data: NewApp) {
    const newApps = await this.db.db.insert(app).values(data).returning().execute();
    return newApps[0];
  }

  /**
   * Returns all apps installed with the given status sorted by id ascending
   *
   * @param {AppStatus} status - The status of the apps to return
   */
  public async getAppsByStatus(status: AppStatus) {
    return this.db.db.query.app.findMany({ where: eq(app.status, status), orderBy: asc(app.id) });
  }

  /**
   * Returns all apps installed sorted by id ascending
   */
  public async getApps() {
    return this.db.db.query.app.findMany({ orderBy: asc(app.id) });
  }

  /**
   * Returns all apps that are running and visible on guest dashboard sorted by id ascending
   */
  public async getGuestDashboardApps() {
    return this.db.db.query.app.findMany({
      where: and(eq(app.status, 'running'), eq(app.isVisibleOnGuestDashboard, true)),
      orderBy: asc(app.id),
    });
  }

  /**
   * Given a domain, return all apps that have this domain, are exposed and not the given id
   *
   * @param {string} domain - The domain to search for
   * @param {string} id - The id of the app to exclude
   */
  public async getAppsByDomain(domain: string, id: string) {
    return this.db.db.query.app.findMany({ where: and(eq(app.domain, domain), eq(app.exposed, true), ne(app.id, id)) });
  }

  /**
   * Given an array of app status, update all apps that have a status not in the array with new values
   *
   * @param {AppStatus[]} statuses - The statuses to exclude from the update
   * @param {Partial<NewApp>} data - The data to update the apps with
   */
  public async updateAppsByStatusNotIn(statuses: AppStatus[], data: Partial<NewApp>) {
    return this.db.db.update(app).set(data).where(notInArray(app.status, statuses)).returning().execute();
  }

  /**
   * Given an app store id, update all apps that have a null app store id with the given app store id
   */
  public async updateAppAppStoreIdWhereNull(appStoreId: number) {
    return this.db.db.update(app).set({ appStoreId }).where(isNull(app.appStoreId)).returning().execute();
  }
}
