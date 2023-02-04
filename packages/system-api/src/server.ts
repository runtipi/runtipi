import 'reflect-metadata';
import express from 'express';
import { ApolloServerPluginLandingPageGraphQLPlayground as Playground } from 'apollo-server-core';
import { createServer } from 'http';
import { ZodError } from 'zod';
import cors, { CorsOptions } from 'cors';
import { ApolloLogs } from './config/logger/apollo.logger';
import logger from './config/logger/logger';
import getSessionMiddleware from './core/middlewares/sessionMiddleware';
import { __prod__ } from './config/constants/constants';
import startJobs from './core/jobs/jobs';
import { applyJsonConfig, getConfig } from './core/config/TipiConfig';
import { eventDispatcher } from './core/config/EventDispatcher';

const corsOptions: CorsOptions = {
  credentials: false,
  origin: (_, callback) => {
    callback(null, true);
  },
};

const main = async () => {
  try {
    eventDispatcher.clear();

    const app = express();
    const port = 3001;

    app.use(cors(corsOptions));
    app.use(getSessionMiddleware);

    const httpServer = createServer(app);

    httpServer.listen(port, async () => {
      startJobs();

      // Start apps
      logger.info(`Server running on port ${port} 🚀 Production => ${__prod__}`);
      logger.info(`Config: ${JSON.stringify(getConfig(), null, 2)}`);
    });
  } catch (error) {
    logger.error(error);
  }
};

main();
