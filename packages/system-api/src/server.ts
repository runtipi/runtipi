/* eslint-disable no-unused-vars */
import express, { NextFunction, Request, Response } from 'express';
import compression from 'compression';
// import suExec from 'su-exec';
import helmet from 'helmet';
import cors from 'cors';
import { isProd } from './constants/constants';
import appsRoutes from './modules/apps/apps.routes';
import systemRoutes from './modules/system/system.routes';
import authRoutes from './modules/auth/auth.routes';
import AuthHelpers from './modules/auth/auth.helpers';
import cookieParser from 'cookie-parser';
import config from './config';

const app = express();
const port = 3001;

app.use(express.json());
app.use(cookieParser());

if (isProd) {
  app.use(compression());
  app.use(helmet());
}

app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      // allow requests with no origin
      if (!origin) return callback(null, true);

      if (config.CLIENT_URLS.indexOf(origin) === -1) {
        var message = "The CORS policy for this origin doesn't allow access from the particular origin.";
        return callback(new Error(message), false);
      }

      return callback(null, true);
    },
  }),
);

// Get user from token
app.use((req, res, next) => {
  let user = null;

  if (req?.cookies?.tipi_token) {
    user = AuthHelpers.tradeTokenForUser(req.cookies.tipi_token);
    if (user) req.user = user;
  }

  next();
});

const restrict = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
  } else {
    next();
  }
};

app.use('/auth', authRoutes);
app.use('/system', restrict, systemRoutes);
app.use('/apps', restrict, appsRoutes);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _: NextFunction) => {
  res.status(200).json({ error: err.message });
});

app.listen(port, () => {
  console.log(`System API listening on port ${port}`);
});
