import path from 'node:path';
import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager, type AppMigration } from '@/modules/apps/app-files-manager';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { DockerService } from '@/modules/docker/docker.service';
import { BackupManager } from '@/modules/backups/backup.manager';
import type { EffectiveAppServices } from '@/modules/docker/compose-config';
import { Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import type { NewApp } from '@/core/database/drizzle/types';

@Injectable()
export class AppMigrationService {
  constructor(
    private readonly appFilesManager: AppFilesManager,
    private readonly appsRepository: AppsRepository,
    private readonly dockerService: DockerService,
    private readonly backupManager: BackupManager,
    private readonly logger: LoggerService,
  ) {}

  public async reconcile(appUrn: AppUrn) {
    await this.backupManager.reconcileRestore(appUrn);
    const app = await this.appsRepository.getAppByUrn(appUrn);
    if (!app?.migrationRecovery) return;

    this.logger.warn(`Recovering interrupted migrations for ${appUrn}: ${app.migrationRecovery.migrationIds.join(', ')}`);
    await this.rollbackMigrations(appUrn, app.migrationRecovery.backupFilename);
  }

  public async rollbackMigrations(appUrn: AppUrn, backupFilename: string) {
    await this.dockerService.stopAppMigrations(appUrn);
    await this.dockerService.composeApp(appUrn, 'down --remove-orphans');
    await this.backupManager.restoreApp(appUrn, backupFilename);
  }

  public async discardRecovery(appUrn: AppUrn, error: unknown) {
    this.logger.warn(`Discarding failed recovery for ${appUrn} before uninstall`, error);
    await this.dockerService.stopAppMigrations(appUrn);
  }

  public async beginMigrationBatch(appUrn: AppUrn, backupFilename: string, migrations: AppMigration[]) {
    await this.appsRepository.setMigrationRecovery(appUrn, { backupFilename, migrationIds: migrations.map((migration) => migration.id) });
  }

  public async baselineCurrentMigrations(appUrn: AppUrn) {
    const migrations = await this.appFilesManager.getAppMigrations(appUrn);
    await this.appsRepository.baselineMigrations(
      appUrn,
      migrations.map((migration) => migration.id),
    );
  }

  public async prepareMigrations(appUrn: AppUrn) {
    const migrations = await this.appFilesManager.getAppMigrations(appUrn);
    if (migrations.length === 0) return [];

    const state = await this.appsRepository.getMigrationState(appUrn);
    const completed = new Set(state.migrationIds);
    const pending = migrations.filter((migration) => !completed.has(migration.id));
    if (pending.length === 0) return [];

    this.assertBackupSupportsMigrations(appUrn, await this.dockerService.getEffectiveAppServices(appUrn));

    for (const migration of pending) {
      const services = await this.dockerService.getEffectiveMigrationServices(appUrn, migration);
      if (Object.keys(services).length !== 1 || typeof services.migration?.image !== 'string') {
        throw new Error(`App migration ${migration.id} must define exactly one service named migration with an image`);
      }

      this.assertBackupSupportsMigrations(appUrn, services);
    }

    for (const migration of pending) {
      await this.dockerService.composeMigration(appUrn, migration, 'pull migration');
    }

    return pending;
  }

  public async runMigrations(appUrn: AppUrn, migrations: AppMigration[]) {
    for (const migration of migrations) {
      this.logger.info(`Running app migration ${migration.id} for ${appUrn}`);
      await this.dockerService.composeMigration(appUrn, migration, 'run --rm --no-TTY --no-deps migration');
      this.logger.info(`Completed app migration ${migration.id} for ${appUrn}`);
    }

    await this.dockerService.stopAppMigrations(appUrn);
  }

  public async commitMigrations(appUrn: AppUrn, migrations: AppMigration[], appUpdate?: Partial<NewApp>) {
    await this.appsRepository.completeMigrations(
      appUrn,
      migrations.map((migration) => migration.id),
      appUpdate,
    );
  }

  private assertBackupSupportsMigrations(appUrn: AppUrn, services: EffectiveAppServices) {
    const appDataDir = this.appFilesManager.getAppDataHostPath(appUrn);

    for (const [name, service] of Object.entries(services)) {
      if (service.volumes_from?.length) {
        throw new Error(`App migrations require a restorable backup; volumes_from is used by: ${name}`);
      }

      for (const volume of service.volumes ?? []) {
        if (volume.read_only || volume.type === 'tmpfs') continue;

        if (volume.type === 'bind' && volume.source) {
          const relativePath = path.relative(appDataDir, volume.source);
          const outsideAppData = relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath);
          if (!outsideAppData) continue;
        }

        throw new Error(`App migrations require a restorable backup; unsupported writable storage is used by: ${name}`);
      }
    }
  }
}
