import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import { isProd } from './constants/constants';
import appsRoutes from './modules/apps/apps.routes';
import systemRoutes from './modules/system/system.routes';

const app = express();
const port = 3001;

if (isProd) {
  app.use(compression());
  app.use(helmet());
}

app.use('/system', systemRoutes);
app.use('/app', appsRoutes);

app.listen(port, () => {
  console.log(`System API listening on port ${port}`);
});
