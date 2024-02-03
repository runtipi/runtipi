import { jwt } from 'hono/jwt';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { Hono } from 'hono';
import { getEnv } from './lib/environment';
import { AppExecutors, SystemExecutors } from './services';

const executor = new AppExecutors();
const system = new SystemExecutors();

export const setupRoutes = (app: Hono) => {
  app.get('/healthcheck', (c) => c.text('OK', 200));

  app.use('*', prettyJSON());
  app.use('*', secureHeaders());

  app.use('*', jwt({ secret: getEnv().jwtSecret, alg: 'HS256' }));

  app.get('/system-status', async (c) => {
    const { success, message } = await system.getSystemLoad();
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/start', async (c) => {
    const appId = c.req.param('id');
    const { success, message } = await executor.startApp(appId, {}, true);
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/stop', async (c) => {
    const appId = c.req.param('id');
    const { success, message } = await executor.stopApp(appId, {}, true);
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/reset', async (c) => {
    const appId = c.req.param('id');
    const { success, message } = await executor.resetApp(appId, {});
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/update', async (c) => {
    const appId = c.req.param('id');
    const { success, message } = await executor.updateApp(appId, {});
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/:id/uninstall', async (c) => {
    const appId = c.req.param('id');
    const { success, message } = await executor.uninstallApp(appId, {});
    if (success) {
      return c.json({ message, ok: true }, 200);
    }
    return c.json({ message, ok: false }, 500);
  });

  app.post('/apps/start-all', async (c) => {
    await executor.startAllApps(true);
    return c.json({ ok: true }, 200);
  });

  app.notFound((c) => c.json({ message: 'Not Found', ok: false }, 404));
};
