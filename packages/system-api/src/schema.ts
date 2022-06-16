import { GraphQLSchema } from 'graphql';
import { buildSchema } from 'type-graphql';
import AppsResolver from './modules/apps/apps.resolver.ts';

const createSchema = (): Promise<GraphQLSchema> =>
  buildSchema({
    resolvers: [AppsResolver],
    validate: true,
  });

export { createSchema };
