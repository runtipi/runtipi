import { clearDatabase } from './db';
import { setSettings, setWelcomeSeen } from './settings';

async function globalSetup() {
  await clearDatabase();
  await setSettings({});
  await setWelcomeSeen(false);
}

export default globalSetup;
