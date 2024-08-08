import { jwt } from 'hono/jwt';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import type { Hono } from 'hono';
import { getEnv } from './lib/environment';
import { SystemExecutors } from './services';
import { container } from './inversify.config';
import type { IAppExecutors } from './services/app/app.executors';

const system = new SystemExecutors();

export const setupRoutes = (app: Hono) => {
  const apps = container.get<IAppExecutors>('IAppExecutors');
  app.get('/healthcheck', (c) => c.text('OK', 200));

  app.use('*', prettyJSON());
  app.use('*', secureHeaders());

  app.use('*', jwt({ secret: getEnv().jwtSecret, alg: 'HS256' }));

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

  app.post('/apps/start-all', async (c) => {
    await apps.startAllApps(true);
    return c.json({ ok: true }, 200);
  });

  app.notFound((c) => c.json({ message: 'Not Found', ok: false }, 404));
};
