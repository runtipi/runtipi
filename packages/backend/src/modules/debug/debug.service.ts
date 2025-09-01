import { DATABASE, type Database } from '@/core/database/database.module';
import { app, appStore, user } from '@/core/database/drizzle/schema';
import type { NewUser } from '@/core/database/drizzle/types';
import { Inject, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import crypto from 'node:crypto';
import { createAppInStore } from '@/tests/utils/create-app-in-store';
import { AppLifecycleService } from '../app-lifecycle/app-lifecycle.service';
import { eq } from 'drizzle-orm';
import { BackupsService } from '../backups/backups.service';

@Injectable()
export class DebugService {
  constructor(
    @Inject(DATABASE) private db: Database,
    private appLifecycleService: AppLifecycleService,
    private backupService: BackupsService,
  ) {}

  public async seedDatabase() {
    // Clean up existing apps
    await this.db.delete(app).execute();
    await this.db.delete(appStore).where(eq(appStore.slug, 'default')).execute().catch();

    const hash = crypto.createHash('sha256');
    hash.update('https://example.com');
    const appStoreHash = hash.digest('hex');

    await this.db
      .insert(appStore)
      .values({
        slug: 'default',
        name: 'Seed',
        url: 'https://example.com',
        hash: appStoreHash,
        branch: 'main',
        enabled: true,
      })
      .execute();

    // Create fake apps
    for (let i = 1; i <= 12; i++) {
      const appInfo = await createAppInStore('default', { id: `app-${i}`, name: `App ${i}`, description: `Description for App ${i}` });

      await this.appLifecycleService.installApp({ appUrn: appInfo.urn, form: {}, skipRun: true });
    }

    // Create test user if it doesn't exist
    const existingUser = await this.db.query.user.findFirst({ where: (user, { eq }) => eq(user.username, 'test@test.com') });
    if (!existingUser) {
      const hash = await argon2.hash('password');
      await this.db
        .insert(user)
        .values({
          username: 'test@test.com',
          password: hash,
          operator: true,
        } as NewUser)
        .execute();
    }

    return { userCreated: !existingUser };
  }

  public async setAllAppUpdateAvailable() {
    await this.db.update(app).set({ version: 0 }).execute();

    return { message: 'All apps set to version 0' };
  }

  public async setAllSubnetsToNull() {
    await this.db.update(app).set({ subnet: null }).execute();

    return { message: 'All app subnets set to null' };
  }

  public async restartAllApps() {
    await this.appLifecycleService.restartAllApps();
  }

  public async backupAllApps() {
    await this.backupService.backupAllApps();
  }
}
