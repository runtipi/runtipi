import { faker } from '@faker-js/faker';
import { createAppEntity } from './fixtures/app.fixtures';
import { getTRPCMock } from './getTrpcMock';
import { createAppConfig } from '../../server/tests/apps.factory';

export const handlers = [
  getTRPCMock({
    path: ['system', 'getVersion'],
    type: 'query',
    response: { current: '1.0.0', latest: '1.0.0', body: 'hello' },
  }),
  getTRPCMock({
    path: ['system', 'restart'],
    type: 'mutation',
    response: true,
    delay: 100,
  }),
  getTRPCMock({
    path: ['system', 'getSettings'],
    type: 'query',
    response: { internalIp: 'localhost', dnsIp: '1.1.1.1', appsRepoUrl: 'https://test.com/test', domain: 'tipi.localhost', localDomain: 'tipi.lan' },
  }),
  getTRPCMock({
    path: ['system', 'updateSettings'],
    type: 'mutation',
    response: undefined,
  }),
  // Auth
  getTRPCMock({
    path: ['auth', 'me'],
    type: 'query',
    response: {
      totpEnabled: false,
      id: faker.number.int(),
      username: faker.internet.userName(),
      locale: 'en',
    },
  }),
  // App
  getTRPCMock({
    path: ['app', 'getApp'],
    type: 'query',
    response: createAppEntity({ status: 'running' }),
  }),
  getTRPCMock({
    path: ['app', 'installedApps'],
    type: 'query',
    response: [createAppEntity({ status: 'running' }), createAppEntity({ status: 'stopped' })],
  }),
  getTRPCMock({
    path: ['app', 'listApps'],
    type: 'query',
    response: { apps: [createAppConfig({}), createAppConfig({})], total: 2 },
  }),
];
