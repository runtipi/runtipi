import { clearDatabase } from './db';

/**
 *
 */
async function globalSetup() {
  await clearDatabase();
}

export default globalSetup;
