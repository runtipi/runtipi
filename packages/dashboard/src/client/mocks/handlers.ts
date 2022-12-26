import { graphql } from 'msw';
import { ConfiguredQuery, LoginMutation, LogoutMutationResult, MeQuery, RefreshTokenQuery, RegisterMutation, RegisterMutationVariables, UsernamePasswordInput } from '../generated/graphql';
import { getTRPCMock } from './getTrpcMock';
import appHandlers from './handlers/appHandlers';

const graphqlHandlers = [
  // Handles a "Login" mutation
  graphql.mutation('Login', (req, res, ctx) => {
    const { username } = req.variables as UsernamePasswordInput;
    sessionStorage.setItem('is-authenticated', username);

    const result: LoginMutation = {
      login: { token: 'token' },
    };

    return res(ctx.delay(), ctx.data(result));
  }),
  // Handles a "Logout" mutation
  graphql.mutation('Logout', (_req, res, ctx) => {
    sessionStorage.removeItem('is-authenticated');

    const result: LogoutMutationResult['data'] = {
      logout: true,
    };

    return res(ctx.delay(), ctx.data(result));
  }),
  // Handles me query
  graphql.query('Me', (_req, res, ctx) => {
    const isAuthenticated = sessionStorage.getItem('is-authenticated');
    if (!isAuthenticated) {
      return res(ctx.errors([{ message: 'Not authenticated' }]));
    }
    const result: MeQuery = {
      me: { id: '1' },
    };
    return res(ctx.delay(), ctx.data(result));
  }),
  graphql.query('RefreshToken', (_req, res, ctx) => {
    const result: RefreshTokenQuery = {
      refreshToken: { token: 'token' },
    };

    return res(ctx.delay(), ctx.data(result));
  }),
  graphql.mutation('Register', (req, res, ctx) => {
    const {
      input: { username },
    } = req.variables as RegisterMutationVariables;

    const result: RegisterMutation = {
      register: { token: 'token' },
    };

    if (username === 'error@error.com') {
      return res(ctx.errors([{ message: 'Username is already taken' }]));
    }

    return res(ctx.data(result));
  }),
  appHandlers.listApps,
  appHandlers.getApp,
  appHandlers.installedApps,
  appHandlers.installApp,
  graphql.query('Configured', (_req, res, ctx) => {
    const result: ConfiguredQuery = {
      isConfigured: true,
    };

    return res(ctx.data(result));
  }),
];

export const handlers = [
  getTRPCMock({
    path: ['system', 'getVersion'],
    type: 'query',
    response: { current: '1.0.0', latest: '1.0.0' },
  }),
  getTRPCMock({
    path: ['system', 'update'],
    type: 'mutation',
    response: true,
    delay: 100,
  }),
  getTRPCMock({
    path: ['system', 'restart'],
    type: 'mutation',
    response: true,
    delay: 100,
  }),
  getTRPCMock({
    path: ['system', 'systemInfo'],
    type: 'query',
    response: { cpu: { load: 0.1 }, disk: { available: 1, total: 2, used: 1 }, memory: { available: 1, total: 2, used: 1 } },
  }),
  ...graphqlHandlers,
];
