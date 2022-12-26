import { GraphQLSchema } from 'graphql';
import { buildSchema } from 'type-graphql';
import { customAuthChecker } from './core/middlewares/authChecker';
import AppsResolver from './modules/apps/apps.resolver';

const createSchema = (): Promise<GraphQLSchema> =>
  buildSchema({
    resolvers: [AppsResolver],
    validate: true,
    authChecker: customAuthChecker,
  });

export { createSchema };
