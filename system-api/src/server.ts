import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import { __prod__ } from './constants/constants';
import { appRoutes, systemRoutes } from './routes';

const app = express();
const port = 3001;

if (__prod__) {
  app.use(compression());
  app.use(helmet());
}

app.use('/system', systemRoutes);
app.use('/app', appRoutes);

app.listen(port, () => {
  console.log(`System API listening on port ${port}`);
});
