import { AppQueries } from '@/server/queries/apps/apps.queries';
import { ICommand } from './types';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { StartAppCommand } from './start-app-command';

export class StartAllAppsCommand implements ICommand {
  constructor(
    private queries: AppQueries,
    private eventDispatcher: EventDispatcher,
  ) {}

  async execute(): Promise<void> {
    const apps = await this.queries.getAppsByStatus('running');

    // Update all apps with status different than running or stopped to stopped
    await this.queries.updateAppsByStatusNotIn(['running', 'stopped', 'missing'], { status: 'stopped' });

    await Promise.all(
      apps.map(async (app) => {
        const command = new StartAppCommand(app.id, this.queries, this.eventDispatcher);
        await command.execute();
      }),
    );
  }
}
