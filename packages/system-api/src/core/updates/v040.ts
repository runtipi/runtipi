import logger from '../../config/logger/logger';
import App from '../../modules/apps/app.entity';
import { AppInfo, AppStatusEnum } from '../../modules/apps/apps.types';
import User from '../../modules/auth/user.entity';
import { deleteFolder, fileExists, readFile, readJsonFile } from '../../modules/fs/fs.helpers';
import Update, { UpdateStatusEnum } from '../../modules/system/update.entity';
import { getConfig } from '../config/TipiConfig';

type AppsState = { installed: string };

const UPDATE_NAME = 'v040';

const migrateApp = async (appId: string): Promise<void> => {
  const app = await App.findOne({ where: { id: appId } });

  if (!app) {
    const envFile = readFile(`/app/storage/app-data/${appId}/app.env`).toString();
    const envVars = envFile.split('\n');
    const envVarsMap = new Map<string, string>();

    envVars.forEach((envVar) => {
      const [key, value] = envVar.split('=');
      envVarsMap.set(key, value);
    });

    const form: Record<string, string> = {};

    const configFile: AppInfo | null = readJsonFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${appId}/config.json`);
    configFile?.form_fields?.forEach((field) => {
      const envVar = field.env_variable;
      const envVarValue = envVarsMap.get(envVar);

      if (envVarValue) {
        form[field.env_variable] = envVarValue;
      }
    });

    await App.create({ id: appId, status: AppStatusEnum.STOPPED, config: form }).save();
  } else {
    logger.info('App already migrated');
  }
};

const migrateUser = async (user: { email: string; password: string }): Promise<void> => {
  await User.create({ username: user.email.trim().toLowerCase(), password: user.password }).save();
};

export const updateV040 = async (): Promise<void> => {
  try {
    const update = await Update.findOne({ where: { name: UPDATE_NAME } });

    if (update) {
      logger.info(`Update ${UPDATE_NAME} already applied`);
      return;
    }

    // Migrate apps
    if (fileExists('/runtipi/state/apps.json')) {
      const state: AppsState = await readJsonFile('/runtipi/state/apps.json');
      const installed: string[] = state.installed.split(' ').filter(Boolean);

      await Promise.all(installed.map((appId) => migrateApp(appId)));
      deleteFolder('/runtipi/state/apps.json');
    }

    // Migrate users
    if (fileExists('/state/users.json')) {
      const state: { email: string; password: string }[] = await readJsonFile('/runtipi/state/users.json');

      await Promise.all(state.map((user) => migrateUser(user)));
      deleteFolder('/runtipi/state/users.json');
    }

    await Update.create({ name: UPDATE_NAME, status: UpdateStatusEnum.SUCCESS }).save();
  } catch (error) {
    logger.error(error);
    await Update.create({ name: UPDATE_NAME, status: UpdateStatusEnum.FAILED }).save();
  }
};
