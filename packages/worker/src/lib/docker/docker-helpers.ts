import path from 'path';
import yaml from 'yaml';
import fs from 'fs';
import { execAsync, pathExists } from '@runtipi/shared/node';
import { sanitizePath } from '@runtipi/shared';
import { logger } from '@/lib/logger';
import { getEnv } from '@/lib/environment';
import { APP_DATA_DIR, DATA_DIR } from '@/config/constants';
import { getAppLabels, getDockerCompose } from '@/config/docker-templates';

const composeUp = async (args: string[]) => {
  logger.info(`Running docker compose with args ${args.join(' ')}`);
  const { stdout, stderr } = await execAsync(`docker-compose ${args.join(' ')}`);

  if (stderr && stderr.includes('Command failed:')) {
    throw new Error(stderr);
  }

  return { stdout, stderr };
};

/**
 * Helpers to execute docker compose commands
 * @param {string} appId - App name
 * @param {string} command - Command to execute
 */
export const compose = async (appId: string, command: string) => {
  const { arch, appsRepoId } = getEnv();
  const appDataDirPath = path.join(APP_DATA_DIR, sanitizePath(appId));
  const appDirPath = path.join(DATA_DIR, 'apps', sanitizePath(appId));

  const args: string[] = [`--env-file ${path.join(appDataDirPath, 'app.env')}`];

  // User custom env file
  const userEnvFile = path.join(DATA_DIR, 'user-config', sanitizePath(appId), 'app.env');
  if (await pathExists(userEnvFile)) {
    args.push(`--env-file ${userEnvFile}`);
  }

  args.push(`--project-name ${appId}`);

  let composeFile = path.join(appDirPath, 'docker-compose.yml');
  if (arch === 'arm64' && (await pathExists(path.join(appDirPath, 'docker-compose.arm64.yml')))) {
    composeFile = path.join(appDirPath, 'docker-compose.arm64.yml');
  }

  // const composeFileRaw = await fs.promises.readFile(composeFile, 'utf8');

  // const composeConfig = yaml.parse(composeFileRaw);

  const generated = getDockerCompose([
    { isMain: true, name: appId, image: 'nginx:1.25.3', internalPort: 80 },
    { isMain: false, name: 'test', image: 'nginx:1.25.3', internalPort: 80 },
  ]);

  console.log(JSON.stringify(generated, null, 2));

  args.push(`-f ${composeFile}`);

  const commonComposeFile = path.join(DATA_DIR, 'repos', sanitizePath(appsRepoId), 'apps', 'docker-compose.common.yml');
  args.push(`-f ${commonComposeFile}`);

  // User defined overrides
  const userComposeFile = path.join(DATA_DIR, 'user-config', sanitizePath(appId), 'docker-compose.yml');
  if (await pathExists(userComposeFile)) {
    args.push(`--file ${userComposeFile}`);
  }

  args.push(command);

  return composeUp(args);
};
