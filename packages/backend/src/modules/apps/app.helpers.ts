import path from 'node:path';
import { extractAppUrn } from '@/common/helpers/app-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
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
   * @param {string} appUrn - The id of the app to generate the env file for.
   * @param {AppEventFormInput} form - The config object for the app.
   * @throws Will throw an error if the app has an invalid config.json file or if a required variable is missing.
   */
  public generateEnvFile = async (appUrn: AppUrn, form: AppEventFormInput) => {
    const { internalIp, envFilePath, rootFolderHost, userSettings } = this.config.getConfig();

    const config = await this.appFilesManager.getInstalledAppInfo(appUrn);

    if (!config) {
      throw new Error(`App ${appUrn} not found`);
    }

    const baseEnvFile = await this.filesytem.readTextFile(envFilePath);
    const envMap = this.envUtils.envStringToMap(baseEnvFile?.toString() ?? '');

    const { appName, appStoreId } = extractAppUrn(appUrn);

    // Default always present env variables
    if (config.port) {
      envMap.set('APP_PORT', form.port ? String(form.port) : String(config.port));
    }
    envMap.set('APP_URN', appUrn);
    envMap.set('APP_ID', `${appName}-${appStoreId}`);
    envMap.set('APP_NAME', appName);
    envMap.set('APP_STORE_ID', appStoreId);
    envMap.set('ROOT_FOLDER_HOST', rootFolderHost);
    envMap.set('APP_DATA_DIR', path.join(`${userSettings.appDataPath}/app-data`, appStoreId, appName));

    const appEnv = await this.appFilesManager.getAppEnv(appUrn);
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

    // Process form fields
    for (const field of config.form_fields) {
      const formValue = form[field.env_variable];
      const envVar = field.env_variable;

      if (formValue === undefined && field.default) {
        envMap.set(envVar, String(field.default));
        continue;
      }

      if (formValue || typeof formValue === 'boolean') {
        envMap.set(envVar, String(formValue));
        continue;
      }

      if (field.type === 'random') {
        if (existingAppEnvMap.has(envVar)) {
          envMap.set(envVar, existingAppEnvMap.get(envVar) as string);
          continue;
        }

        const length = field.min ?? 32;
        const randomString = this.envUtils.createRandomString(field.env_variable, length, field.encoding);
        envMap.set(envVar, randomString);
        continue;
      }

      if (formValue === undefined && field.required) {
        throw new Error(`Variable ${field.label || field.env_variable} is required`);
      }
    }

    if (form.exposed && form.domain && typeof form.domain === 'string') {
      envMap.set('APP_EXPOSED', 'true');
      envMap.set('APP_DOMAIN', form.domain);
      envMap.set('APP_HOST', form.domain);
      envMap.set('APP_PROTOCOL', 'https');
    } else if (form.exposedLocal && !form.openPort) {
      const subdomain = form.localSubdomain ? form.localSubdomain : `${appName}-${appStoreId}`;

      envMap.set('APP_DOMAIN', `${subdomain}.${envMap.get('LOCAL_DOMAIN')}`);
      envMap.set('APP_HOST', `${subdomain}.${envMap.get('LOCAL_DOMAIN')}`);
      envMap.set('APP_PROTOCOL', 'https');
    } else {
      if (config.port) {
        envMap.set('APP_DOMAIN', `${internalIp}:${form.port}`);
      }

      envMap.set('APP_HOST', internalIp);
      envMap.set('APP_PROTOCOL', 'http');
    }

    await this.appFilesManager.writeAppEnv(appUrn, this.envUtils.envMapToString(envMap));
  };
}
