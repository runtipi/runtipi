import { graphql, rest } from 'msw';
import {
  ConfiguredQuery,
  LoginMutation,
  LogoutMutationResult,
  MeQuery,
  RefreshTokenQuery,
  RegisterMutation,
  RegisterMutationVariables,
  UsernamePasswordInput,
  VersionQuery,
  SystemInfoQuery,
} from '../generated/graphql';
import appHandlers from './handlers/appHandlers';

const restHandlers = [
  rest.get('/api/status', (req, res, ctx) =>
    res(
      ctx.delay(200),
      ctx.status(200),
      ctx.json({
        status: 'RUNNING',
      }),
    ),
  ),
];
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
  graphql.mutation('Logout', (req, res, ctx) => {
    sessionStorage.removeItem('is-authenticated');

    const result: LogoutMutationResult['data'] = {
      logout: true,
    };

    return res(ctx.delay(), ctx.data(result));
  }),

  // Handles me query
  graphql.query('Me', (req, res, ctx) => {
    const isAuthenticated = sessionStorage.getItem('is-authenticated');
    if (!isAuthenticated) {
      return res(ctx.errors([{ message: 'Not authenticated' }]));
    }
    const result: MeQuery = {
      me: { id: '1' },
    };

    return res(ctx.delay(), ctx.data(result));
  }),

  graphql.query('RefreshToken', (req, res, ctx) => {
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
  graphql.query('Version', (req, res, ctx) => {
    const result: VersionQuery = {
      version: {
        current: '1.0.0',
        latest: '1.0.0',
      },
    };

    return res(ctx.data(result));
  }),

  graphql.query('Configured', (req, res, ctx) => {
    const result: ConfiguredQuery = {
      isConfigured: true,
    };

    return res(ctx.data(result));
  }),

  graphql.query('SystemInfo', (req, res, ctx) => {
    const result: SystemInfoQuery = {
      systemInfo: {
        cpu: {
          load: 50,
        },
        disk: {
          available: 1000000000,
          total: 2000000000,
          used: 1000000000,
        },
        memory: {
          available: 1000000000,
          total: 2000000000,
          used: 1000000000,
        },
      },
    };

    return res(ctx.data(result));
  }),
];

export const handlers = [...graphqlHandlers, ...restHandlers];
