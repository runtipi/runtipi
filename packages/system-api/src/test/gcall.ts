import { ExecutionResult, graphql, GraphQLSchema } from 'graphql';
import { Maybe } from 'type-graphql';
import { createSchema } from '../schema';

interface Options {
  source: string;
  variableValues?: Maybe<{
    [key: string]: unknown;
  }>;
  userId?: number;
  session?: string;
}

let schema: GraphQLSchema | null = null;

export const gcall = async <T>({ source, variableValues, userId, session }: Options): Promise<ExecutionResult<T, { [key: string]: unknown }>> => {
  if (!schema) {
    schema = await createSchema();
  }

  return graphql({
    schema,
    source,
    variableValues,
    contextValue: { req: { session: { userId, id: session } } },
  }) as unknown as ExecutionResult<T, { [key: string]: unknown }>;
};
