import { runPostgresMigrations } from './run-migration';
import { EventDispatcher, EventTypes } from './src/server/core/EventDispatcher';
import { getConfig, setConfig } from './src/server/core/TipiConfig';

const main = async () => {
  // Run database migrations
  await runPostgresMigrations();

  // Update app store repository
  await EventDispatcher.dispatchEventAsync(EventTypes.CLONE_REPO, [getConfig().appsRepoUrl]);
  await EventDispatcher.dispatchEventAsync(EventTypes.UPDATE_REPO, [getConfig().appsRepoUrl]);

  // startJobs();
  setConfig('status', 'RUNNING');

  // Start apps
  // appsService.startAllApps();
  console.info(`Config: ${JSON.stringify(getConfig(), null, 2)}`);
};

main();
