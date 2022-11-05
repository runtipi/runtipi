import 'reflect-metadata';
import express from 'express';
import { ApolloServerPluginLandingPageGraphQLPlayground as Playground } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-express';
import { createServer } from 'http';
import { ZodError } from 'zod';
import cors from 'cors';
import { createSchema } from './schema';
import { ApolloLogs } from './config/logger/apollo.logger';
import logger from './config/logger/logger';
import getSessionMiddleware from './core/middlewares/sessionMiddleware';
import { MyContext } from './types';
import { __prod__ } from './config/constants/constants';
import datasource from './config/datasource';
import appsService from './modules/apps/apps.service';
import { runUpdates } from './core/updates/run';
import recover from './core/updates/recover-migrations';
import startJobs from './core/jobs/jobs';
import { applyJsonConfig, getConfig, setConfig } from './core/config/TipiConfig';
import systemController from './modules/system/system.controller';
import { eventDispatcher, EventTypes } from './core/config/EventDispatcher';

const applyCustomConfig = () => {
  try {
    applyJsonConfig();
  } catch (e) {
    logger.error('Error applying settings.json config');
    if (e instanceof ZodError) {
      Object.keys(e.flatten().fieldErrors).forEach((key) => {
        logger.error(`Error in field ${key}`);
      });
    }
  }
};

const main = async () => {
  try {
    eventDispatcher.clear();
    applyCustomConfig();

    const app = express();
    const port = 3001;

    app.use(express.static(`${getConfig().rootFolder}/repos/${getConfig().appsRepoId}`));
    app.use(cors());
    app.use('/status', systemController.status);
    app.use(getSessionMiddleware);

    await datasource.initialize();

    const schema = await createSchema();
    const httpServer = createServer(app);
    const plugins = [ApolloLogs];

    if (!__prod__) {
      plugins.push(Playground());
    }

    const apolloServer = new ApolloServer({
      schema,
      context: ({ req, res }): MyContext => ({ req, res }),
      plugins,
    });

    await apolloServer.start();
    apolloServer.applyMiddleware({ app });

    try {
      await datasource.runMigrations();
    } catch (e) {
      logger.error(e);
      await recover(datasource);
    }

    // Run migrations
    await runUpdates();

    httpServer.listen(port, async () => {
      await eventDispatcher.dispatchEventAsync(EventTypes.CLONE_REPO, [getConfig().appsRepoUrl]);
      await eventDispatcher.dispatchEventAsync(EventTypes.UPDATE_REPO, [getConfig().appsRepoUrl]);

      startJobs();
      setConfig('status', 'RUNNING');

      // Start apps
      appsService.startAllApps();
      logger.info(`Server running on port ${port} 🚀 Production => ${__prod__}`);
      logger.info(`Config: ${JSON.stringify(getConfig(), null, 2)}`);
    });
  } catch (error) {
    logger.error(error);
  }
};

main();
