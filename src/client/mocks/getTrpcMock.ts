import { rest } from 'msw';
import SuperJSON from 'superjson';
import type { RouterInput, RouterOutput } from '../../server/routers/_app';

export type RpcResponse<Data> = RpcSuccessResponse<Data> | RpcErrorResponse;

export type RpcSuccessResponse<Data> = {
  id: null;
  result: { type: 'data'; data: Data };
};

export type RpcErrorResponse = {
  error: {
    json: {
      message: string;
      code: number;
      data: {
        code: string;
        httpStatus: number;
        stack: string;
        path: string; // TQuery
        zodError?: Record<string, string>;
        tError: {
          message: string;
        };
      };
    };
  };
};

const jsonRpcSuccessResponse = (data: unknown): RpcSuccessResponse<unknown> => {
  const response = SuperJSON.serialize(data);

  return {
    id: null,
    result: { type: 'data', data: response },
  };
};

const jsonRpcErrorResponse = (path: string, status: number, message: string, zodError?: Record<string, string>): RpcErrorResponse => ({
  error: {
    json: {
      message,
      code: -32600,
      data: {
        code: 'INTERNAL_SERVER_ERROR',
        httpStatus: status,
        stack: 'Error: Internal Server Error',
        path,
        zodError,
        tError: {
          message,
        },
      },
    },
  },
});

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

  return fn(route, (_, res, ctx) => res(ctx.delay(endpoint.delay), ctx.json(jsonRpcSuccessResponse(endpoint.response))));
};

export const getTRPCMockError = <
  K1 extends keyof RouterInput,
  K2 extends keyof RouterInput[K1], // object itself
>(endpoint: {
  path: [K1, K2];
  type?: 'query' | 'mutation';
  status?: number;
  message?: string;
  zodError?: Record<string, string>;
}) => {
  const fn = endpoint.type === 'mutation' ? rest.post : rest.get;

  const route = `http://localhost:3000/api/trpc/${endpoint.path[0]}.${endpoint.path[1] as string}`;

  return fn(route, (_, res, ctx) =>
    res(ctx.delay(), ctx.json(jsonRpcErrorResponse(`${endpoint.path[0]}.${endpoint.path[1] as string}`, endpoint.status ?? 500, endpoint.message ?? 'Internal Server Error', endpoint.zodError))),
  );
};
