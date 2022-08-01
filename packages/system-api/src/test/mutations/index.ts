/* eslint-disable import/no-extraneous-dependencies */
import 'graphql-import-node';
import { print } from 'graphql/language/printer';

import * as installApp from './installApp.graphql';

export const installAppMutation = print(installApp);
