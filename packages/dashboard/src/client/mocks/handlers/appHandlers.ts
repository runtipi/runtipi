import { graphql } from 'msw';
import { faker } from '@faker-js/faker';
import { createAppsRandomly } from '../fixtures/app.fixtures';
import { AppInputType, AppStatusEnum, GetAppQuery, InstallAppMutation, InstalledAppsQuery, ListAppsQuery } from '../../generated/graphql';

// eslint-disable-next-line no-promise-executor-return
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const notEmpty = <TValue>(value: TValue | null | undefined): value is TValue => value !== null && value !== undefined;

const removeDuplicates = <T extends { id: string }>(array: T[]) =>
  array.filter((a, i) => {
    const index = array.findIndex((_a) => _a.id === a.id);
    return index === i;
  });

export const mockedApps = removeDuplicates(createAppsRandomly(faker.datatype.number({ min: 20, max: 30 })));

export const mockInstalledAppIds = mockedApps.slice(0, faker.datatype.number({ min: 5, max: 8 })).map((a) => a.id);
const stoppedAppsIds = mockInstalledAppIds.slice(0, faker.datatype.number({ min: 1, max: 3 }));

/**
 * GetApp handler
 */
const getApp = graphql.query('GetApp', (req, res, ctx) => {
  const { appId } = req.variables as { appId: string };

  const app = mockedApps.find((a) => a.id === appId);

  if (!app) {
    return res(ctx.errors([{ message: 'App not found' }]));
  }

  const isInstalled = mockInstalledAppIds.includes(appId);

  let status = AppStatusEnum.Missing;
  if (isInstalled) {
    status = AppStatusEnum.Running;
  }
  if (isInstalled && stoppedAppsIds.includes(appId)) {
    status = AppStatusEnum.Stopped;
  }

  const result: GetAppQuery = {
    getApp: {
      id: app.id,
      status,
      info: app,
      __typename: 'App',
      config: {},
      exposed: false,
      updateInfo: null,
      domain: null,
      version: 1,
    },
  };

  return res(ctx.data(result));
});

const getAppError = graphql.query('GetApp', (req, res, ctx) => res(ctx.errors([{ message: 'test-error' }])));

/**
 * ListApps handler
 */
const listApps = graphql.query('ListApps', async (req, res, ctx) => {
  const result: ListAppsQuery = {
    listAppsInfo: {
      apps: mockedApps,
      total: mockedApps.length,
    },
  };

  await wait(100);

  return res(ctx.data(result));
});

const listAppsEmpty = graphql.query('ListApps', (req, res, ctx) => {
  const result: ListAppsQuery = {
    listAppsInfo: {
      apps: [],
      total: 0,
    },
  };
  return res(ctx.data(result));
});

const listAppsError = graphql.query('ListApps', (req, res, ctx) => res(ctx.errors([{ message: 'test-error' }])));

/**
 * InstalledApps handler
 */
const installedApps = graphql.query('InstalledApps', (req, res, ctx) => {
  const apps: InstalledAppsQuery['installedApps'] = mockInstalledAppIds
    .map((id) => {
      const app = mockedApps.find((a) => a.id === id);
      if (!app) return null;

      let status = AppStatusEnum.Running;
      if (stoppedAppsIds.includes(id)) {
        status = AppStatusEnum.Stopped;
      }

      return {
        __typename: 'App' as const,
        id: app.id,
        status,
        config: {},
        info: app,
        version: 1,
        updateInfo: null,
      };
    })
    .filter(notEmpty);

  const result: InstalledAppsQuery = {
    installedApps: apps,
  };

  return res(ctx.data(result));
});

const installedAppsEmpty = graphql.query('InstalledApps', (req, res, ctx) => {
  const result: InstalledAppsQuery = {
    installedApps: [],
  };

  return res(ctx.data(result));
});

const installedAppsError = graphql.query('InstalledApps', (req, res, ctx) => res(ctx.errors([{ message: 'test-error' }])));

const installedAppsNoInfo = graphql.query('InstalledApps', (req, res, ctx) => {
  const result: InstalledAppsQuery = {
    installedApps: [
      {
        __typename: 'App' as const,
        id: 'app-id',
        status: AppStatusEnum.Running,
        config: {},
        info: null,
        version: 1,
        updateInfo: null,
      },
    ],
  };
  return res(ctx.data(result));
});

/**
 * Install app handler
 */
const installApp = graphql.mutation('InstallApp', (req, res, ctx) => {
  const { input } = req.variables as { input: AppInputType };

  const app = mockedApps.find((a) => a.id === input.id);

  if (!app) {
    return res(ctx.errors([{ message: 'App not found' }]));
  }

  const result: InstallAppMutation = {
    installApp: {
      __typename: 'App' as const,
      id: app.id,
      status: AppStatusEnum.Running,
    },
  };

  return res(ctx.data(result));
});

export default { getApp, getAppError, listApps, listAppsEmpty, listAppsError, installedApps, installedAppsEmpty, installedAppsError, installedAppsNoInfo, installApp };
