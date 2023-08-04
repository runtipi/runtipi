import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { getEnv } from '../environment/environment';
import { pathExists } from '../fs-helpers/fs-helpers';

const execAsync = promisify(exec);

const composeUp = async (args: string[]) => {
  const { stdout, stderr } = await execAsync(`docker compose ${args.join(' ')}`);
  console.log('stdout', stdout);
  console.log('stderr', stderr);

  return { stdout, stderr };
};

/**
 * Helpers to execute docker compose commands
 * @param {string} appId - App name
 * @param {string} command - Command to execute
 */
export const compose = async (appId: string, command: string) => {
  const { arch, rootFolderHost, appsRepoId, storagePath } = getEnv();
  const appDataDirPath = path.join(storagePath, 'app-data', appId);
  const appDirPath = path.join(rootFolderHost, 'apps', appId);

  const args: string[] = [`--env-file ${path.join(appDataDirPath, 'app.env')}`];

  // User custom env file
  const userEnvFile = path.join(rootFolderHost, 'user-config', appId, 'app.env');
  if (await pathExists(userEnvFile)) {
    args.push(`--env-file ${userEnvFile}`);
  }

  args.push(`--project-name ${appId}`);

  let composeFile = path.join(appDirPath, 'docker-compose.yml');
  if (arch === 'arm64' && (await pathExists(path.join(appDirPath, 'docker-compose.arm64.yml')))) {
    composeFile = path.join(appDirPath, 'docker-compose.arm64.yml');
  }
  args.push(`-f ${composeFile}`);

  const commonComposeFile = path.join(rootFolderHost, 'repos', appsRepoId, 'apps', 'docker-compose.common.yml');
  args.push(`-f ${commonComposeFile}`);

  // User defined overrides
  const userComposeFile = path.join(rootFolderHost, 'user-config', appId, 'docker-compose.yml');
  if (await pathExists(userComposeFile)) {
    args.push(`--file ${userComposeFile}`);
  }

  args.push(command);

  return composeUp(args);
};
