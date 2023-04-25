import { clearDatabase } from './db';

/**
 *
 */
async function globalSetup() {
  await clearDatabase();
  console.log('Global setup...');
}

export default globalSetup;
