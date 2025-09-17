import { DATABASE, type Database } from '@/core/database/database.module';
import { app, appStore } from '@/core/database/drizzle/schema';
import { Inject, Injectable } from '@nestjs/common';
import { createAppInStore } from '@/tests/utils/create-app-in-store';
import { AppLifecycleService } from '../app-lifecycle/app-lifecycle.service';
import { eq } from 'drizzle-orm';
import { BackupsService } from '../backups/backups.service';
import { AppStoreService } from '../app-stores/app-store.service';
import { createAppUrn } from '@/common/helpers/app-helpers';
import { updateAppInStore } from '@/tests/utils/update-app-in-store';
import { MarketplaceService } from '../marketplace/marketplace.service';

@Injectable()
export class DebugService {
  constructor(
    @Inject(DATABASE) private db: Database,
    private appLifecycleService: AppLifecycleService,
    private backupService: BackupsService,
    private appstoreService: AppStoreService,
    private marketplaceService: MarketplaceService,
  ) {}

  public async seedDatabase() {
    // Clean up
    const apps = await this.db.select().from(app).where(eq(app.appStoreSlug, 'seed'));
    for (const app of apps) {
      await this.appLifecycleService.uninstallApp({ appUrn: createAppUrn(app.appName, app.appStoreSlug), removeBackups: true });
    }

    if ((await this.db.select().from(appStore).where(eq(appStore.slug, 'seed'))).length > 0) {
      let retries = 3;
      while (retries > 0) {
        if ((await this.db.select().from(app).where(eq(app.appStoreSlug, 'seed'))).length === 0) {
          await this.appstoreService.deleteAppStore('seed');
          break;
        }
        retries--;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    await this.appstoreService.createAppStore({
      name: 'seed',
      url: 'https://github.com/runtipi/example-appstore',
    });

    await this.marketplaceService.initialize();

    // Create fake apps
    for (let i = 1; i <= 12; i++) {
      const appInfo = await createAppInStore('seed', { id: `app-${i}`, name: `App ${i}`, description: `Description for App ${i}` });

      await this.appLifecycleService.installApp({ appUrn: appInfo.urn, form: {}, skipRun: true });
    }
  }

  public async setAllAppUpdateAvailable() {
    await this.db.update(app).set({ version: 0 }).where(eq(app.appStoreSlug, 'seed')).execute();

    return { message: 'All apps set to version 0' };
  }

  public async setAllSubnetsToNull() {
    await this.db.update(app).set({ subnet: null }).where(eq(app.appStoreSlug, 'seed')).execute();

    return { message: 'All app subnets set to null' };
  }

  public async startAllApps() {
    await this.appLifecycleService.startAllApps();
  }

  public async backupAllApps() {
    await this.backupService.backupAllApps();
  }

  public async incrementAllAppVersions() {
    const apps = await this.db.select().from(app).where(eq(app.appStoreSlug, 'seed'));

    for (const app of apps) {
      await updateAppInStore(app.appStoreSlug, app.appName, { tipi_version: app.version + 1 });
    }
  }

  public async uninstallAllApps() {
    const apps = await this.db.select().from(app);

    for (const installedApp of apps) {
      const appUrn = createAppUrn(installedApp.appName, installedApp.appStoreSlug);
      await this.appLifecycleService.uninstallApp({ appUrn, removeBackups: true });
    }

    return { message: `Started uninstalling ${apps.length} apps` };
  }
}
