import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import { isProd } from './constants/constants';
import appsRoutes from './modules/apps/apps.routes';
import systemRoutes from './modules/system/system.routes';

const app = express();
const port = 3001;

app.use(express.json());

if (isProd) {
  app.use(compression());
  app.use(helmet());
}

app.use(cors());

app.use('/system', systemRoutes);
app.use('/apps', appsRoutes);

app.listen(port, () => {
  console.log(`System API listening on port ${port}`);
});
