import { DATABASE, type Database } from '@/core/database/database.module';
import { app, appStore, user } from '@/core/database/drizzle/schema';
import type { AppStatus, NewUser } from '@/core/database/drizzle/types';
import { Inject, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import crypto from 'node:crypto';
import { createAppInStore } from '@/tests/utils/create-app-in-store';
import { AppLifecycleService } from '../app-lifecycle/app-lifecycle.service';

@Injectable()
export class DebugService {
  constructor(
    @Inject(DATABASE) private db: Database,
    private appLifecycleService: AppLifecycleService,
  ) {}

  public async seedDatabase() {
    // Clean up existing apps
    await this.db.delete(app).execute();
    await this.db.delete(appStore).execute();

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
    for (let i = 1; i <= 6; i++) {
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
}
