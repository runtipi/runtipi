import { clearDatabase } from './db';
import { setSettings } from './settings';

/**
 *
 */
async function globalSetup() {
  await clearDatabase();
  await setSettings({});
}

export default globalSetup;
