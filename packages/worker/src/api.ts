import { jwt } from 'hono/jwt';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { Hono } from 'hono';
import { getEnv } from './lib/environment';
import { AppExecutors } from './services';

const executor = new AppExecutors();

export const setupRoutes = (app: Hono) => {
  app.get('/healthcheck', (c) => c.text('OK', 200));

  app.use('*', prettyJSON());
  app.use('*', secureHeaders());

  app.use('/apps', jwt({ secret: getEnv().jwtSecret }));

  app.post('/apps/:id/start', async (c) => {
    const app = c.req.param('id');
    const { success, message } = await executor.startApp(app, {}, true);
    if (success) {
      return c.json({ message, ok: true }, 200);
    } else {
      return c.json({ message, ok: false }, 500);
    }
  });

  app.post('/apps/:id/stop', async (c) => {
    const app = c.req.param('id');
    const { success, message } = await executor.stopApp(app, {}, true);
    if (success) {
      return c.json({ message, ok: true }, 200);
    } else {
      return c.json({ message, ok: false }, 500);
    }
  });

  app.post('/apps/:id/reset', async (c) => {
    const app = c.req.param('id');
    const { success, message } = await executor.resetApp(app, {});
    if (success) {
      return c.json({ message, ok: true }, 200);
    } else {
      return c.json({ message, ok: false }, 500);
    }
  });

  app.post('/apps/:id/update', async (c) => {
    const app = c.req.param('id');
    const { success, message } = await executor.updateApp(app, {});
    if (success) {
      return c.json({ message, ok: true }, 200);
    } else {
      return c.json({ message, ok: false }, 500);
    }
  });

  app.post('/apps/:id/uninstall', async (c) => {
    const app = c.req.param('id');
    const { success, message } = await executor.uninstallApp(app, {});
    if (success) {
      return c.json({ message, ok: true }, 200);
    } else {
      return c.json({ message, ok: false }, 500);
    }
  });

  app.post('/apps/start-all', async (c) => {
    await executor.startAllApps(true);
    return c.json({ ok: true }, 200);
  });

  app.notFound((c) => c.json({ message: 'Not Found', ok: false }, 404));
};
