import type { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { container } from '../inversify.config';
import { SystemExecutors } from '../services';
import type { IAppExecutors } from '../services/app/app.executors';
import { late, z } from 'zod';
import path from 'path';
import { APP_DIR, DATA_DIR } from '../config';
import { pathExists } from 'fs-extra';
import { promises } from 'fs';
import { getAvailableApps, validateApp } from './api.helpers';
import { getEnv } from '@/lib/environment';
import { appInfoSchema } from '@runtipi/shared';
import semver from 'semver';

const system = new SystemExecutors();

export const setupRoutes = (app: Hono) => {
  const apps = container.get<IAppExecutors>('IAppExecutors');
  app.get('/healthcheck', (c) => c.text('OK', 200));

  app.use('*', prettyJSON());
  app.use('*', secureHeaders());

  // app.use('*', jwt({ secret: getEnv().jwtSecret, alg: 'HS256' }));

  app.get('/system/status', async (c) => {
    const result = await system.getSystemLoad();
    if (result.success) {
      return c.json({ data: result.data, ok: true }, 200);
    }
    return c.json({ message: result.message, ok: false }, 500);
  });

  app.get('/system/certificate', async (c) => {
    const filePath = path.join(DATA_DIR, 'traefik', 'tls', 'cert.pem');
    if (await pathExists(filePath)) {
      const cert = await promises.readFile(filePath);
      c.header('content-type', 'application/x-pem-file');
      c.header('content-disposition', 'attachment; filename=cert.pem');
      c.status(200);
      return c.body(cert);
    }
    return c.json({ message: 'File not found', ok: false }, 404);
  });

  app.get('/system/updates', async (c) => {
    const tipiVersion = getEnv().tipiVersion;
    const releaseStatus = await fetch(
      'https://api.github.com/repos/runtipi/runtipi/releases/latest',
    );
    const latestVersion = (await releaseStatus.json()).tag_name;
    const isLatest =
      semver.valid(tipiVersion) &&
      semver.valid(latestVersion) &&
      semver.gte(tipiVersion, latestVersion);
    if (!isLatest) {
      return c.json(
        { isLatest: false, currentVersion: tipiVersion, latestVersion: latestVersion, ok: true },
        200,
      );
    }
    return c.json(
      { isLatest: true, currentVersion: tipiVersion, latestVersion: tipiVersion, ok: true },
      200,
    );
  });

  app.post('/apps/:id/start', async (c) => {
    const appId = c.req.param('id');
    if (!(await validateApp(appId))) {
      return c.json({ message: 'App not found', ok: false }, 404);
    }
    const { success, message } = await apps.startApp(appId, {}, true);
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/stop', async (c) => {
    const appId = c.req.param('id');
    if (!(await validateApp(appId))) {
      return c.json({ message: 'App not found', ok: false }, 404);
    }
    const { success, message } = await apps.stopApp(appId, {}, true);
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/restart', async (c) => {
    const appId = c.req.param('id');
    if (!(await validateApp(appId))) {
      return c.json({ message: 'App not found', ok: false }, 404);
    }
    const { success, message } = await apps.restartApp(appId, {}, true);
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/reset', async (c) => {
    const appId = c.req.param('id');
    if (!(await validateApp(appId))) {
      return c.json({ message: 'App not found', ok: false }, 404);
    }
    const { success, message } = await apps.resetApp(appId, {});
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/update', async (c) => {
    const appId = c.req.param('id');
    if (!(await validateApp(appId))) {
      return c.json({ message: 'App not found', ok: false }, 404);
    }
    const { success, message } = await apps.updateApp(appId, {}, false);
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/uninstall', async (c) => {
    const appId = c.req.param('id');
    if (!(await validateApp(appId))) {
      return c.json({ message: 'App not found', ok: false }, 404);
    }
    const { success, message } = await apps.uninstallApp(appId, {});
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/backup', async (c) => {
    const appId = c.req.param('id');
    if (!(await validateApp(appId))) {
      return c.json({ message: 'App not found', ok: false }, 404);
    }
    const { success, message } = await apps.backupApp(appId);
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/restore', async (c) => {
    const appId = c.req.param('id');
    if (!(await validateApp(appId))) {
      return c.json({ message: 'App not found', ok: false }, 404);
    }
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
    if (!(await validateApp(appId))) {
      return c.json({ message: 'App not found', ok: false }, 404);
    }
    const backupPath = path.join(DATA_DIR, 'backups', appId);
    if (await pathExists(backupPath)) {
      return c.json(
        { message: '', backups: [(await promises.readdir(backupPath))[0]], ok: true },
        200,
      );
    }
    return c.json({ message: 'No backups found', backups: [''], ok: false }, 404);
  });

  app.get('/apps/available-apps', async (c) => {
    const availableApps = await getAvailableApps(
      path.join(DATA_DIR, 'repos', getEnv().appsRepoId, 'apps'),
    );
    if (availableApps.success) {
      return c.json({ message: '', availableApps: availableApps.appList, ok: true }, 200);
    }
    return c.json({ message: availableApps.error, availableApps: [''], ok: false }, 500);
  });

  app.get('/apps/:id/logo', async (c) => {
    const appId = c.req.param('id');
    if (!(await validateApp(appId))) {
      return c.json({ message: 'App not found', ok: false }, 404);
    }
    const defaultFilePath = path.join(DATA_DIR, 'apps', appId, 'metadata', 'logo.jpg');
    const appRepoFilePath = path.join(
      DATA_DIR,
      'repos',
      getEnv().appsRepoId,
      'apps',
      appId,
      'metadata',
      'logo.jpg',
    );

    let filePath = path.join(APP_DIR, 'public', 'app-not-found.jpg');

    if (await pathExists(defaultFilePath)) {
      filePath = defaultFilePath;
    } else if (await pathExists(appRepoFilePath)) {
      filePath = appRepoFilePath;
    }

    const file = await promises.readFile(filePath);

    c.header('content-type', 'image/jpeg');
    c.header('cache-control', 'public, max-age=86400');
    c.status(200);

    return c.body(file);
  });

  app.get('/apps/:id/get-config', async (c) => {
    const appId = c.req.param('id');
    if (!(await validateApp(appId))) {
      return c.json({ message: 'App not found', ok: false }, 404);
    }
    const configPath = path.join(
      DATA_DIR,
      'repos',
      getEnv().appsRepoId,
      'apps',
      appId,
      'config.json',
    );
    const configRaw = await promises.readFile(configPath, 'utf-8');
    const configParsed = await appInfoSchema.safeParseAsync(configRaw);
    if (configParsed.success) {
      return c.json({ message: '', config: configParsed.data, ok: true }, 200);
    }
    return c.json({ message: configParsed.error, config: {}, ok: false }, 500);
  });

  app.get('/apps/installed-apps', async (c) => {
    const installedApps = await getAvailableApps(path.join(DATA_DIR, 'apps'));
    if (installedApps.success) {
      return c.json({ message: '', installedApps: installedApps.appList, ok: true }, 200);
    }
    return c.json({ message: installedApps.error, installedApps: [''], ok: false }, 500);
  });

  app.post('/apps/start-all', async (c) => {
    await apps.startAllApps(true);
    return c.json({ ok: true }, 200);
  });

  app.notFound((c) => c.json({ message: 'Not Found', ok: false }, 404));
};
