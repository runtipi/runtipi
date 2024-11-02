import type { IAppQueries } from '@/server/queries/apps/apps.queries';
import { TranslatedError } from '@/server/utils/errors';
import type { AppLifecycleCommandParams, IAppLifecycleCommand } from './types';
import type { IEventDispatcher } from '@/server/core/EventDispatcher/EventDispatcher';
import { getClass } from 'src/inversify.config';
import { formSchema } from '@runtipi/shared';

export class RestartAppCommand implements IAppLifecycleCommand {
  private queries: IAppQueries;
  private eventDispatcher: IEventDispatcher;

  constructor(params: AppLifecycleCommandParams) {
    this.queries = params.queries;
    this.eventDispatcher = params.eventDispatcher;
  }

  private async sendEvent(appId: string, form: unknown): Promise<void> {
    const logger = getClass('ILogger');
    const { success, stdout } = await this.eventDispatcher.dispatchEventAsync({
      type: 'app',
      command: 'restart',
      appid: appId,
      form: formSchema.parse(form),
    });

    if (success) {
      await this.queries.updateApp(appId, { status: 'running' });
    } else {
      logger.error(`Failed to restart app ${appId}: ${stdout}`);
      await this.queries.updateApp(appId, { status: 'stopped' });
    }
  }

  async execute(params: { appId: string }): Promise<void> {
    const { appId } = params;
    const app = await this.queries.getApp(appId);

    if (!app) {
      throw new TranslatedError('APP_ERROR_APP_NOT_FOUND', { id: appId });
    }

    // Run script
    await this.queries.updateApp(appId, { status: 'restarting' });

    void this.sendEvent(appId, app.config);
  }
}
