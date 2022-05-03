import express, { NextFunction, Request, Response } from 'express';
import compression from 'compression';
// import suExec from 'su-exec';
import helmet from 'helmet';
import cors from 'cors';
import { isProd } from './constants/constants';
import appsRoutes from './modules/apps/apps.routes';
import systemRoutes from './modules/system/system.routes';
import networkRoutes from './modules/network/network.routes';

// suExec.init();

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
app.use('/network', networkRoutes);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  res.status(200).json({ error: err.message });
});

app.listen(port, () => {
  console.log(`System API listening on port ${port}`);
});
