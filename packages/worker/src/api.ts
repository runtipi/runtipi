import { jwt } from 'hono/jwt';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

import { Hono } from 'hono';
import { getEnv } from './lib/environment';

export const setupRoutes = (app: Hono) => {
  app.get('/healthcheck', (c) => c.text('OK', 200));

  app.use('*', prettyJSON());
  app.use('*', secureHeaders());

  app.use('*', jwt({ secret: getEnv().jwtSecret }));

  app.get('/test', (c) => c.json({ test: 'OK' }, 200));

  app.notFound((c) => c.json({ message: 'Not Found', ok: false }, 404));
};
