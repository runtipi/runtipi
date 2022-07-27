/* eslint-disable import/no-extraneous-dependencies */
import 'graphql-import-node';
import { print } from 'graphql/language/printer';

import * as listAppInfos from './listAppInfos.graphql';

export const listAppInfosQuery = print(listAppInfos);
