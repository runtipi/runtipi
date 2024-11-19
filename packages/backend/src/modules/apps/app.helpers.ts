import path from 'path';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { Injectable } from '@nestjs/common';
import { EnvUtils } from '../env/env.utils';
import type { AppEventFormInput } from '../queue/entities/app-events';
import { AppFilesManager } from './app-files-manager';

@Injectable()
export class AppHelpers {
  constructor(
    private readonly appFilesManager: AppFilesManager,
    private readonly config: ConfigurationService,
    private readonly filesytem: FilesystemService,
    private readonly envUtils: EnvUtils,
  ) {}

  /**
   * This function generates an env file for the provided app.
   * It reads the config.json file for the app, parses it,
   * and uses the app's form fields and domain to generate the env file
   * if the app is exposed and has a domain set, it adds the domain to the env file,
   * otherwise, it adds the internal IP address to the env file
   * It also creates the app-data folder for the app if it does not exist
   *
   * @param {string} appId - The id of the app to generate the env file for.
   * @param {AppEventFormInput} form - The config object for the app.
   * @throws Will throw an error if the app has an invalid config.json file or if a required variable is missing.
   */
  public generateEnvFile = async (appId: string, form: AppEventFormInput) => {
    const { internalIp, envFilePath, rootFolderHost } = this.config.getConfig();

    const config = await this.appFilesManager.getInstalledAppInfo(appId);

    if (!config) {
      throw new Error(`App ${appId} not found`);
    }

    const baseEnvFile = await this.filesytem.readTextFile(envFilePath);
    const envMap = this.envUtils.envStringToMap(baseEnvFile?.toString() ?? '');

    // Default always present env variables
    envMap.set('APP_PORT', String(config.port));
    envMap.set('APP_ID', appId);
    envMap.set('ROOT_FOLDER_HOST', rootFolderHost);
    envMap.set('APP_DATA_DIR', path.join(this.config.get('userSettings').appDataPath, appId));

    const appEnv = await this.appFilesManager.getAppEnv(appId);
    const existingAppEnvMap = this.envUtils.envStringToMap(appEnv.content);

    if (config.generate_vapid_keys) {
      if (existingAppEnvMap.has('VAPID_PUBLIC_KEY') && existingAppEnvMap.has('VAPID_PRIVATE_KEY')) {
        envMap.set('VAPID_PUBLIC_KEY', existingAppEnvMap.get('VAPID_PUBLIC_KEY') as string);
        envMap.set('VAPID_PRIVATE_KEY', existingAppEnvMap.get('VAPID_PRIVATE_KEY') as string);
      } else {
        const vapidKeys = this.envUtils.generateVapidKeys();
        envMap.set('VAPID_PUBLIC_KEY', vapidKeys.publicKey);
        envMap.set('VAPID_PRIVATE_KEY', vapidKeys.privateKey);
      }
    }

    await Promise.all(
      config.form_fields.map(async (field) => {
        const formValue = form[field.env_variable];
        const envVar = field.env_variable;

        if (formValue || typeof formValue === 'boolean') {
          envMap.set(envVar, String(formValue));
        } else if (field.type === 'random') {
          if (existingAppEnvMap.has(envVar)) {
            envMap.set(envVar, existingAppEnvMap.get(envVar) as string);
          } else {
            const length = field.min || 32;
            const randomString = this.envUtils.createRandomString(field.env_variable, length, field.encoding);

            envMap.set(envVar, randomString);
          }
        } else if (field.required) {
          throw new Error(`Variable ${field.label || field.env_variable} is required`);
        }
      }),
    );

    if (form.exposed && form.domain && typeof form.domain === 'string') {
      envMap.set('APP_EXPOSED', 'true');
      envMap.set('APP_DOMAIN', form.domain);
      envMap.set('APP_HOST', form.domain);
      envMap.set('APP_PROTOCOL', 'https');
    } else if (form.exposedLocal && !form.openPort) {
      envMap.set('APP_DOMAIN', `${config.id}.${envMap.get('LOCAL_DOMAIN')}`);
      envMap.set('APP_HOST', `${config.id}.${envMap.get('LOCAL_DOMAIN')}`);
      envMap.set('APP_PROTOCOL', 'https');
    } else {
      envMap.set('APP_DOMAIN', `${internalIp}:${config.port}`);
      envMap.set('APP_HOST', internalIp);
      envMap.set('APP_PROTOCOL', 'http');
    }

    await this.appFilesManager.writeAppEnv(appId, this.envUtils.envMapToString(envMap));
  };
}
