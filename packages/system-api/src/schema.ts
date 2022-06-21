import { GraphQLSchema } from 'graphql';
import { buildSchema } from 'type-graphql';
import { customAuthChecker } from './core/middlewares/authChecker';
import AppsResolver from './modules/apps/apps.resolver';
import AuthResolver from './modules/auth/auth.resolver';
import SystemResolver from './modules/system/system.resolver';

const createSchema = (): Promise<GraphQLSchema> =>
  buildSchema({
    resolvers: [AppsResolver, AuthResolver, SystemResolver],
    validate: true,
    authChecker: customAuthChecker,
  });

export { createSchema };
