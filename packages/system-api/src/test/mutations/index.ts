/* eslint-disable import/no-extraneous-dependencies */
import 'graphql-import-node';
import { print } from 'graphql/language/printer';

import * as installApp from './installApp.graphql';
import * as startApp from './startApp.graphql';
import * as stopApp from './stopApp.graphql';
import * as uninstallApp from './uninstallApp.graphql';
import * as updateAppConfig from './updateAppConfig.graphql';
import * as updateApp from './updateApp.graphql';
import * as register from './register.graphql';
import * as login from './login.graphql';

export const installAppMutation = print(installApp);
export const startAppMutation = print(startApp);
export const stopAppMutation = print(stopApp);
export const uninstallAppMutation = print(uninstallApp);
export const updateAppConfigMutation = print(updateAppConfig);
export const updateAppMutation = print(updateApp);
export const registerMutation = print(register);
export const loginMutation = print(login);
