import type { AppStatus } from '@/core/database/drizzle/types';
import { LoggerService } from '@/core/logger/logger.service';
import { SSEService } from '@/core/sse/sse.service';
import { Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppsRepository } from '../../apps/apps.repository';

type AppEventType =
  | 'status_change'
  | 'install_success'
  | 'install_error'
  | 'start_success'
  | 'start_error'
  | 'stop_success'
  | 'stop_error'
  | 'restart_success'
  | 'restart_error'
  | 'uninstall_success'
  | 'uninstall_error'
  | 'reset_success'
  | 'reset_error'
  | 'update_success'
  | 'update_error'
  | 'backup_success'
  | 'backup_error'
  | 'restore_success'
  | 'restore_error';

type SSEAppEvent = {
  event: AppEventType;
  appUrn: AppUrn;
  appStatus?: AppStatus;
  error?: string;
};

@Injectable()
export class StatusManagerService {
  constructor(
    private readonly appRepository: AppsRepository,
    private readonly sseService: SSEService,
    private readonly logger: LoggerService,
  ) {}

  async transitionTo(appId: number, appUrn: AppUrn, status: AppStatus) {
    await this.appRepository.updateAppById(appId, { status });
    this.sseService.emit('app', { event: 'status_change', appUrn, appStatus: status });
  }

  async emitSuccess(params: { appId: number; appUrn: AppUrn; event: AppEventType; status: AppStatus; clearPendingRestart?: boolean }) {
    const { appId, appUrn, event, status, clearPendingRestart } = params;

    this.logger.info(`App ${appUrn} ${event.replace('_success', '')} completed successfully`);
    this.sseService.emit('app', { event, appUrn, appStatus: status } as SSEAppEvent);

    const updateData: { status: AppStatus; pendingRestart?: boolean } = { status };
    if (clearPendingRestart) {
      updateData.pendingRestart = false;
    }

    await this.appRepository.updateAppById(appId, updateData);
  }

  async emitError(params: { appId: number; appUrn: AppUrn; event: AppEventType; status: AppStatus; error: string }) {
    const { appId, appUrn, event, status, error } = params;

    this.logger.error(`App ${appUrn} ${event.replace('_error', '')} failed: ${error}`);
    this.sseService.emit('app', { event, appUrn, appStatus: status, error } as SSEAppEvent);

    await this.appRepository.updateAppById(appId, { status });
  }

  emitEvent(params: { appUrn: AppUrn; event: AppEventType; error?: string }) {
    const { appUrn, event, error } = params;
    this.sseService.emit('app', { event, appUrn, error } as SSEAppEvent);
  }

  async deleteApp(appId: number) {
    await this.appRepository.deleteAppById(appId);
  }
}
