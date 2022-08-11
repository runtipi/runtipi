import config from '../../config';
import logger from '../../config/logger/logger';
import App from '../../modules/apps/app.entity';
import { AppInfo, AppStatusEnum } from '../../modules/apps/apps.types';
import User from '../../modules/auth/user.entity';
import { deleteFolder, fileExists, readFile, readJsonFile } from '../../modules/fs/fs.helpers';
import Update, { UpdateStatusEnum } from '../../modules/system/update.entity';

type AppsState = { installed: string };

const UPDATE_NAME = 'v040';

export const updateV040 = async (): Promise<void> => {
  try {
    const update = await Update.findOne({ where: { name: UPDATE_NAME } });

    if (update) {
      logger.info(`Update ${UPDATE_NAME} already applied`);
      return;
    }

    // Migrate apps
    if (fileExists('/state/apps.json')) {
      const state: AppsState = await readJsonFile('/state/apps.json');
      const installed: string[] = state.installed.split(' ').filter(Boolean);

      for (const appId of installed) {
        const app = await App.findOne({ where: { id: appId } });

        if (!app) {
          const envFile = readFile(`/app-data/${appId}/app.env`).toString();
          const envVars = envFile.split('\n');
          const envVarsMap = new Map<string, string>();

          envVars.forEach((envVar) => {
            const [key, value] = envVar.split('=');
            envVarsMap.set(key, value);
          });

          const form: Record<string, string> = {};

          const configFile: AppInfo | null = readJsonFile(`/repos/${config.APPS_REPO_ID}/apps/${appId}/config.json`);
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
      }
      deleteFolder('/state/apps.json');
    }

    // Migrate users
    if (fileExists('/state/users.json')) {
      const state: { email: string; password: string }[] = await readJsonFile('/state/users.json');

      for (const user of state) {
        await User.create({ username: user.email.trim().toLowerCase(), password: user.password }).save();
      }
      deleteFolder('/state/users.json');
    }

    await Update.create({ name: UPDATE_NAME, status: UpdateStatusEnum.SUCCESS }).save();
  } catch (error) {
    logger.error(error);
    console.error(error);
    await Update.create({ name: UPDATE_NAME, status: UpdateStatusEnum.FAILED }).save();
  }
};
