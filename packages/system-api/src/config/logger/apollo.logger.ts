/* eslint-disable require-await */
import { PluginDefinition } from 'apollo-server-core';
import { __prod__ } from '../constants/constants';
import logger from './logger';

const ApolloLogs: PluginDefinition = {
  requestDidStart: async () => {
    return {
      async didEncounterErrors(errors) {
        if (!__prod__) {
          logger.error(JSON.stringify(errors.errors));
        }
      },
    };
  },
};

export { ApolloLogs };
