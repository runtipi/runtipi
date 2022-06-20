import 'reflect-metadata';
import express from 'express';
import { ApolloServerPluginLandingPageGraphQLPlayground as Playground } from 'apollo-server-core';
import config from './config';
import { DataSource } from 'typeorm';
import { ApolloServer } from 'apollo-server-express';
import { createSchema } from './schema';
import { ApolloLogs } from './config/logger/apollo.logger';
import { createServer } from 'http';
import logger from './config/logger/logger';
import getSessionMiddleware from './core/middlewares/sessionMiddleware';
import { MyContext } from './types';

const main = async () => {
  try {
    const app = express();
    const port = 3001;

    const sessionMiddleware = await getSessionMiddleware();
    app.use(sessionMiddleware);

    const AppDataSource = new DataSource(config.typeorm);
    await AppDataSource.initialize();

    const schema = await createSchema();

    const httpServer = createServer(app);

    const apolloServer = new ApolloServer({
      schema,
      context: ({ req, res }): MyContext => ({ req, res }),
      plugins: [Playground({ settings: { 'request.credentials': 'include' } }), ApolloLogs],
    });
    await apolloServer.start();
    apolloServer.applyMiddleware({ app });

    httpServer.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });
  } catch (error) {
    console.log(error);
    logger.error(error);
  }
};

main();
