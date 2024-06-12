import { AppQueries } from '@/server/queries/apps/apps.queries';
import { AppLifecycleCommandParams, IAppLifecycleCommand } from './types';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { StartAppCommand } from './start-app-command';

export class StartAllAppsCommand implements IAppLifecycleCommand {
  private queries: AppQueries;
  private eventDispatcher: EventDispatcher;

  constructor(params: AppLifecycleCommandParams) {
    this.queries = params.queries;
    this.eventDispatcher = params.eventDispatcher;
  }

  async execute(): Promise<void> {
    const apps = await this.queries.getAppsByStatus('running');

    // Update all apps with status different than running or stopped to stopped
    await this.queries.updateAppsByStatusNotIn(['running', 'stopped', 'missing'], { status: 'stopped' });

    await Promise.all(
      apps.map(async (app) => {
        const command = new StartAppCommand({ queries: this.queries, eventDispatcher: this.eventDispatcher });
        await command.execute({ appId: app.id });
      }),
    );
  }
}
