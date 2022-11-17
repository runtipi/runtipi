import { z } from 'zod';
import logger from '../../config/logger/logger';
import App from '../../modules/apps/app.entity';
import { appInfoSchema } from '../../modules/apps/apps.helpers';
import { AppStatusEnum } from '../../modules/apps/apps.types';
import User from '../../modules/auth/user.entity';
import { deleteFolder, fileExists, readFile, readJsonFile } from '../../modules/fs/fs.helpers';
import Update, { UpdateStatusEnum } from '../../modules/system/update.entity';
import { getConfig } from '../config/TipiConfig';

const appStateSchema = z.object({ installed: z.string().optional().default('') });
const userStateSchema = z.object({ email: z.string(), password: z.string() }).array();

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

    const configFile = readJsonFile(`/runtipi/repos/${getConfig().appsRepoId}/apps/${appId}/config.json`);
    const parsedConfig = appInfoSchema.safeParse(configFile);

    if (parsedConfig.success) {
      parsedConfig.data.form_fields.forEach((field) => {
        const envVar = field.env_variable;
        const envVarValue = envVarsMap.get(envVar);

        if (envVarValue) {
          form[field.env_variable] = envVarValue;
        }
      });

      await App.create({ id: appId, status: AppStatusEnum.STOPPED, config: form }).save();
    }
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
      const state = readJsonFile('/runtipi/state/apps.json');
      const parsedState = appStateSchema.safeParse(state);

      if (parsedState.success) {
        const installed: string[] = parsedState.data.installed.split(' ').filter(Boolean);
        await Promise.all(installed.map((appId) => migrateApp(appId)));
        deleteFolder('/runtipi/state/apps.json');
      }
    }

    // Migrate users
    if (fileExists('/runtipi/state/users.json')) {
      const state = readJsonFile('/runtipi/state/users.json');
      const parsedState = userStateSchema.safeParse(state);

      if (parsedState.success) {
        await Promise.all(parsedState.data.map((user) => migrateUser(user)));
        deleteFolder('/runtipi/state/users.json');
      }
    }

    await Update.create({ name: UPDATE_NAME, status: UpdateStatusEnum.SUCCESS }).save();
  } catch (error) {
    logger.error(error);
    await Update.create({ name: UPDATE_NAME, status: UpdateStatusEnum.FAILED }).save();
  }
};
