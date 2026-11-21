import { TranslatableError } from '@/common/error/translatable-error';
import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import { computeUpdateNoticesFingerprint } from '@/common/helpers/update-notices';
import { selectUpdateNotices } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';
import semver from 'semver';
import { AppsRepository } from '../../apps/apps.repository';
import { MarketplaceService } from '../../marketplace/marketplace.service';
import { AppLifecycleCommandFactory } from '../app-lifecycle-command.factory';
import { AppJobService } from '../services/app-job.service';
import { StatusManagerService } from '../services/status-manager.service';
import { type HandlerResult, type ILifecycleHandler } from './base-handler';

export type UpdateAppParams = {
  performBackup: boolean;
  /**
   * Ids of the update notices requiring confirmation that were acknowledged
   * in the update wizard.
   */
  acknowledgedNoticeIds?: string[];
  /** The package revision the user reviewed in the wizard. */
  targetTipiVersion?: number;
  /** Fingerprint of the notices displayed to the user. */
  noticesFingerprint?: string;
};

@Injectable()
export class UpdateAppHandler implements ILifecycleHandler<UpdateAppParams> {
  constructor(
    private readonly logger: LoggerService,
    private readonly appRepository: AppsRepository,
    private readonly commandFactory: AppLifecycleCommandFactory,
    private readonly statusManager: StatusManagerService,
    private readonly config: ConfigurationService,
    private readonly marketplaceService: MarketplaceService,
    private readonly jobs: AppJobService,
  ) {}

  async execute(appUrn: AppUrn, params?: UpdateAppParams): Promise<HandlerResult> {
    const app = await this.appRepository.getAppByUrn(appUrn);

    if (!app) throw new TranslatableError('APP_ERROR_APP_NOT_FOUND', { id: appUrn }, HttpStatus.NOT_FOUND);
    if (app.status !== 'running' && app.status !== 'stopped') throw new ConflictException('Wait for the current app operation to finish.');

    const version = this.config.get('version');
    const { minTipiVersion, latestVersion, updateNotices } = await this.marketplaceService.getAppUpdateInfo(appUrn);

    if (minTipiVersion && semver.valid(version) && semver.lt(version, minTipiVersion)) {
      throw new TranslatableError('APP_UPDATE_ERROR_MIN_TIPI_VERSION', { id: appUrn, minVersion: minTipiVersion });
    }

    // Enforce update notice acknowledgements before any state change. The
    // applicable notices are recomputed from the catalog at submission time:
    // acknowledgements are never persisted, so a failed update shows its
    // notices again on the next attempt.
    const applicableNotices = selectUpdateNotices(updateNotices, app.version, latestVersion);
    const requiredNotices = applicableNotices.filter((notice) => notice.require_confirmation);
    const currentFingerprint = computeUpdateNoticesFingerprint(applicableNotices);

    // A reviewed snapshot must always match what is currently applicable, even
    // when the notices no longer require confirmation: rejecting a stale
    // snapshot forces the user to review the new content.
    if (params?.targetTipiVersion !== undefined && params.targetTipiVersion !== latestVersion) {
      throw new TranslatableError('APP_UPDATE_ERROR_TARGET_CHANGED', { id: appUrn }, HttpStatus.CONFLICT);
    }

    if (params?.noticesFingerprint !== undefined && params.noticesFingerprint !== currentFingerprint) {
      throw new TranslatableError('APP_UPDATE_ERROR_NOTICES_CHANGED', { id: appUrn }, HttpStatus.CONFLICT);
    }

    if (requiredNotices.length > 0) {
      const acknowledged = new Set(params?.acknowledgedNoticeIds ?? []);
      const missing = requiredNotices.filter((notice) => !acknowledged.has(notice.id));

      if (missing.length > 0) {
        throw new TranslatableError('APP_UPDATE_ERROR_NOTICES_NOT_ACKNOWLEDGED', { id: appUrn }, HttpStatus.BAD_REQUEST);
      }

      // A confirmation only makes sense against a fully identified snapshot:
      // the reviewed target revision and notice content must be provided too.
      if (params?.targetTipiVersion === undefined) {
        throw new TranslatableError('APP_UPDATE_ERROR_TARGET_REQUIRED', { id: appUrn }, HttpStatus.BAD_REQUEST);
      }

      if (params?.noticesFingerprint === undefined) {
        throw new TranslatableError('APP_UPDATE_ERROR_FINGERPRINT_REQUIRED', { id: appUrn }, HttpStatus.BAD_REQUEST);
      }
    }

    const request: HandlerResult = this.jobs.submit(appUrn, 'update', async (context) => {
      let terminalStatus = app.status;

      try {
        await this.statusManager.transitionTo(app.id, appUrn, 'updating');

        const result = await this.commandFactory.execute(
          {
            command: 'update',
            appUrn,
            requestId: request.requestId,
            form: app.config,
            performBackup: params?.performBackup ?? false,
            wasRunningBeforeUpdate: app.status === 'running',
            // Always pin execution to the revision and notices validated above,
            // including bulk updates and clients that omit review fields.
            targetTipiVersion: latestVersion,
            noticesFingerprint: currentFingerprint,
          },
          context,
        );

        if (result.success) {
          await this.statusManager.emitSuccess({ appId: app.id, appUrn, event: 'update_success', status: app.status });
        } else {
          terminalStatus = 'rollbackSucceeded' in result && result.rollbackSucceeded === true ? app.status : 'stopped';

          if (context.signal.aborted && 'rollbackSucceeded' in result && result.rollbackSucceeded === true) {
            await this.statusManager.transitionTo(app.id, appUrn, terminalStatus);
          } else {
            await this.statusManager.emitError({ appId: app.id, appUrn, event: 'update_error', status: terminalStatus, error: result.message });
          }
        }

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to process update result for app ${appUrn}: ${message}`);

        await this.statusManager.emitError({ appId: app.id, appUrn, event: 'update_error', status: terminalStatus, error: message });
        return { success: false, message };
      }
    });

    return request;
  }
}
