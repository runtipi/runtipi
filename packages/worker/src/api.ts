import type { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { container } from './inversify.config';
import { getEnv } from './lib/environment';
import { SystemExecutors } from './services';
import type { IAppExecutors } from './services/app/app.executors';
import { z } from 'zod';
import path from 'path';
import { DATA_DIR } from './config';
import { pathExists } from 'fs-extra';
import { promises } from 'fs';

const system = new SystemExecutors();

export const setupRoutes = (app: Hono) => {
  const apps = container.get<IAppExecutors>('IAppExecutors');
  app.get('/healthcheck', (c) => c.text('OK', 200));

  app.use('*', prettyJSON());
  app.use('*', secureHeaders());

  // app.use('*', jwt({ secret: getEnv().jwtSecret, alg: 'HS256' }));

  app.get('/system-status', async (c) => {
    const result = await system.getSystemLoad();
    if (result.success) {
      return c.json({ data: result.data, ok: true }, 200);
    }
    return c.json({ message: result.message, ok: false }, 500);
  });

  app.post('/apps/:id/start', async (c) => {
    const appId = c.req.param('id');
    const { success, message } = await apps.startApp(appId, {}, true);
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/stop', async (c) => {
    const appId = c.req.param('id');
    const { success, message } = await apps.stopApp(appId, {}, true);
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/restart', async (c) => {
    const appId = c.req.param('id');
    const { success, message } = await apps.restartApp(appId, {}, true);
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/reset', async (c) => {
    const appId = c.req.param('id');
    const { success, message } = await apps.resetApp(appId, {});
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/update', async (c) => {
    const appId = c.req.param('id');
    const { success, message } = await apps.updateApp(appId, {}, false);
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/uninstall', async (c) => {
    const appId = c.req.param('id');
    const { success, message } = await apps.uninstallApp(appId, {});
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/backup', async (c) => {
    const appId = c.req.param('id');
    const { success, message } = await apps.backupApp(appId);
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/restore', async (c) => {
    const appId = c.req.param('id');
    try {
      const data = await z.object({ backupName: z.string() }).safeParseAsync(await c.req.json());
      if (data.success) {
        const { success, message } = await apps.restoreApp(appId, data.data.backupName);
        if (success) {
          return c.json({ message, ok: true }, 200);
        }
      }
      return c.json({ message: [data.error], ok: false }, 500);
    } catch {
      return c.json({ message: 'Invalid json', ok: false }, 500);
    }
  });

  app.get('/apps/:id/list-backups', async (c) => {
    const appId = c.req.param('id');
    const backupPath = path.join(DATA_DIR, 'backups', appId);
    if (await pathExists(backupPath)) {
      return c.json({ message: [(await promises.readdir(backupPath))[0]], ok: true }, 200);
    }
    return c.json({ message: 'No backups found', ok: false }, 404);
  });

  app.get('/apps/available-apps', async (c) => {
    try {
      const repo = path.join(DATA_DIR, 'repos', getEnv().appsRepoId, 'apps');
      const ignoreList = ['__tests__', 'schema.json'];
      let availableApps: string[] = [];
      for (const element of await promises.readdir(repo)) {
        if (ignoreList.indexOf(element) == -1) {
          availableApps.push(element);
        }
      }
      return c.json({ message: availableApps, ok: true }, 200);
    } catch (e) {
      return c.json({ message: e, ok: false }, 200);
    }
  });

  app.post('/apps/start-all', async (c) => {
    await apps.startAllApps(true);
    return c.json({ ok: true }, 200);
  });

  app.notFound((c) => c.json({ message: 'Not Found', ok: false }, 404));
};
