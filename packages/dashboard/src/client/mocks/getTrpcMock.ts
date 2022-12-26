import { rest } from 'msw';
import SuperJSON from 'superjson';
import type { RouterInput, RouterOutput } from '../../server/routers/_app';

export type RpcResponse<Data> = RpcSuccessResponse<Data> | RpcErrorResponse;

export type RpcSuccessResponse<Data> = {
  id: null;
  result: { type: 'data'; data: Data };
};

export type RpcErrorResponse = {
  id: null;
  error: {
    json: {
      message: string;
      code: number;
      data: {
        code: string;
        httpStatus: number;
        stack: string;
        path: string; // TQuery
      };
    };
  };
};

const jsonRpcSuccessResponse = (data: unknown): RpcSuccessResponse<any> => {
  const response = SuperJSON.serialize(data);

  return {
    id: null,
    result: { type: 'data', data: response },
  };
};

const jsonRpcErrorResponse = (path: string, status: number, message: string): RpcErrorResponse => ({
  id: null,
  error: {
    json: {
      message,
      code: -32600,
      data: {
        code: 'INTERNAL_SERVER_ERROR',
        httpStatus: status,
        stack: 'Error: Internal Server Error',
        path,
      },
    },
  },
});
/**
 * Mocks a TRPC endpoint and returns a msw handler for Storybook.
 * Only supports routes with two levels.
 * The path and response is fully typed and infers the type from your routes file.
 * @todo make it accept multiple endpoints
 * @param endpoint.path - path to the endpoint ex. ["post", "create"]
 * @param endpoint.response - response to return ex. {id: 1}
 * @param endpoint.type - specific type of the endpoint ex. "query" or "mutation" (defaults to "query")
 * @returns - msw endpoint
 * @example
 * Page.parameters = {
    msw: {
      handlers: [
        getTRPCMock({
          path: ["post", "getMany"],
          type: "query",
          response: [
            { id: 0, title: "test" },
            { id: 1, title: "test" },
          ],
        }),
      ],
    },
  };
 */
export const getTRPCMock = <
  K1 extends keyof RouterInput,
  K2 extends keyof RouterInput[K1], // object itself
  O extends RouterOutput[K1][K2], // all its keys
>(endpoint: {
  path: [K1, K2];
  response: O;
  type?: 'query' | 'mutation';
  delay?: number;
}) => {
  const fn = endpoint.type === 'mutation' ? rest.post : rest.get;

  const route = `http://localhost:3000/api/trpc/${endpoint.path[0]}.${endpoint.path[1] as string}`;

  return fn(route, (req, res, ctx) => res(ctx.delay(endpoint.delay), ctx.json(jsonRpcSuccessResponse(endpoint.response))));
};

export const getTRPCMockError = <
  K1 extends keyof RouterInput,
  K2 extends keyof RouterInput[K1], // object itself
>(endpoint: {
  path: [K1, K2];
  type?: 'query' | 'mutation';
  status?: number;
  message?: string;
}) => {
  const fn = endpoint.type === 'mutation' ? rest.post : rest.get;

  const route = `http://localhost:3000/api/trpc/${endpoint.path[0]}.${endpoint.path[1] as string}`;

  return fn(route, (req, res, ctx) =>
    res(ctx.delay(), ctx.json(jsonRpcErrorResponse(`${endpoint.path[0]}.${endpoint.path[1] as string}`, endpoint.status ?? 500, endpoint.message ?? 'Internal Server Error'))),
  );
};
