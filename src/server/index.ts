/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */
import express from 'express';
import { parse } from 'url';

import type { NextServer } from 'next/dist/server/next';
import { EventDispatcher } from './core/EventDispatcher';
import { getConfig, setConfig } from './core/TipiConfig';
import { Logger } from './core/Logger';
import { runPostgresMigrations } from './run-migration';
import { AppServiceClass } from './services/apps/apps.service';
import { db } from './db';
import { sessionMiddleware } from './middlewares/session.middleware';
import { AuthQueries } from './queries/auth/auth.queries';

let conf = {};
let nextApp: NextServer;

const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';

if (!dev) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const NextServer = require('next/dist/server/next-server').default;
  conf = require('./.next/required-server-files.json').config;
  nextApp = new NextServer({ hostname: 'localhost', dev, port, customServer: true, conf });
} else {
  const next = require('next');
  nextApp = next({ dev, hostname, port });
}

const handle = nextApp.getRequestHandler();

nextApp.prepare().then(async () => {
  const app = express();
  const authService = new AuthQueries(db);

  app.disable('x-powered-by');

  app.use(sessionMiddleware);

  app.use('/static', express.static(`${getConfig().rootFolder}/repos/${getConfig().appsRepoId}/`));

  app.use('/certificate', async (req, res) => {
    const userId = req.session?.userId;
    const user = await authService.getUserById(userId as number);

    if (user?.operator) {
      res.setHeader('Content-Dispositon', 'attachment; filename=cert.pem');
      return res.sendFile(`${getConfig().rootFolder}/traefik/tls/cert.pem`);
    }

    return res.status(403).send('Forbidden');
  });

  app.all('*', (req, res) => {
    const parsedUrl = parse(req.url, true);

    handle(req, res, parsedUrl);
  });

  app.listen(port, async () => {
    const appService = new AppServiceClass(db);
    EventDispatcher.clear();

    // Run database migrations
    if (getConfig().NODE_ENV === 'development') {
      await runPostgresMigrations();
    }
    setConfig('status', 'RUNNING');

    // Clone and update apps repo
    await EventDispatcher.dispatchEventAsync('clone_repo', [getConfig().appsRepoUrl]);
    await EventDispatcher.dispatchEventAsync('update_repo', [getConfig().appsRepoUrl]);

    // Scheduled events
    EventDispatcher.scheduleEvent({ type: 'update_repo', args: [getConfig().appsRepoUrl], cronExpression: '*/30 * * * *' });
    EventDispatcher.scheduleEvent({ type: 'system_info', args: [], cronExpression: '* * * * *' });

    appService.startAllApps();

    Logger.info(`> Server listening at http://localhost:${port} as ${dev ? 'development' : process.env.NODE_ENV}`);
  });
});
