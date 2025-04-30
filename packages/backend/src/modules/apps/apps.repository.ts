import { extractAppUrn } from '@/common/helpers/app-helpers';
import { DATABASE, type Database } from '@/core/database/database.module';
import { app } from '@/core/database/drizzle/schema';
import type { AppStatus, NewApp } from '@/core/database/drizzle/types';
import type { AppUrn } from '@/types/app/app.types';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, ne, notInArray } from 'drizzle-orm';

@Injectable()
export class AppsRepository {
  constructor(@Inject(DATABASE) private db: Database) {}

  /**
   * Given an app id, return the app
   *
   * @param {string} appId - The id of the app to return
   */
  public async getAppById(appId: number) {
    return this.db.query.app.findFirst({ where: eq(app.id, appId), with: { appStore: true } });
  }

  public async getAppByUrn(appUrn: AppUrn) {
    const { appStoreId, appName } = extractAppUrn(appUrn);

    return this.db.query.app.findFirst({ where: and(eq(app.appName, appName), eq(app.appStoreSlug, appStoreId)) });
  }

  /**
   * Given an app id, update the app with the given data
   *
   * @param {string} appId - The id of the app to update
   * @param {Partial<NewApp>} data - The data to update the app with
   */
  public async updateAppById(appId: number, data: Partial<NewApp>) {
    const updatedApps = await this.db.update(app).set(data).where(eq(app.id, appId)).returning().execute();
    return updatedApps[0];
  }

  /**
   * Given an app id, delete the app
   *
   * @param {string} appId - The id of the app to delete
   */
  public async deleteAppById(appId: number) {
    await this.db.delete(app).where(eq(app.id, appId)).execute();
  }

  /**
   * Given app data, creates a new app
   *
   * @param {NewApp} data - The data to create the app with
   */
  public async createApp(data: NewApp) {
    const newApps = await this.db.insert(app).values(data).returning().execute();

    const createdApp = newApps[0];

    if (!createdApp) {
      throw new Error('Failed to create app');
    }

    return createdApp;
  }

  /**
   * Returns all apps installed with the given status sorted by id ascending
   *
   * @param {AppStatus} status - The status of the apps to return
   */
  public async getAppsByStatus(status: AppStatus) {
    return this.db.query.app.findMany({ where: eq(app.status, status), orderBy: asc(app.appName) });
  }

  /**
   * Returns all apps installed sorted by id ascending
   */
  public async getApps() {
    return this.db.query.app.findMany({ orderBy: asc(app.appName), with: { appStore: true } });
  }

  /**
   * Returns all apps that are running and visible on guest dashboard sorted by id ascending
   */
  public async getGuestDashboardApps() {
    return this.db.query.app.findMany({
      where: and(eq(app.status, 'running'), eq(app.isVisibleOnGuestDashboard, true)),
      orderBy: asc(app.appName),
      with: { appStore: true },
    });
  }

  /**
   * Given a domain, return all apps that have this domain, are exposed and not the given id
   *
   * @param {string} domain - The domain to search for
   * @param {string} id - The id of the app to exclude
   */
  public async getAppsByDomain(domain: string, id?: number) {
    if (!id) {
      return this.db.query.app.findMany({ where: and(eq(app.domain, domain), eq(app.exposed, true)) });
    }
    return this.db.query.app.findMany({ where: and(eq(app.domain, domain), eq(app.exposed, true), ne(app.id, id)) });
  }

  /**
   * Given an array of app status, update all apps that have a status not in the array with new values
   *
   * @param {AppStatus[]} statuses - The statuses to exclude from the update
   * @param {Partial<NewApp>} data - The data to update the apps with
   */
  public async updateAppsByStatusNotIn(statuses: AppStatus[], data: Partial<NewApp>) {
    return this.db.update(app).set(data).where(notInArray(app.status, statuses)).returning().execute();
  }
}
