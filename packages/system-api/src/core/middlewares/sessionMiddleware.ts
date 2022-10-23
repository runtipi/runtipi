import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../../config/logger/logger';
import TipiCache from '../../config/TipiCache';
import { getConfig } from '../config/TipiConfig';

const getSessionMiddleware = async (req: Request, _: Response, next: NextFunction) => {
  req.session = {};

  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const decodedToken = jwt.verify(token, getConfig().jwtSecret) as { id: number; session: string };

      const userId = await TipiCache.get(decodedToken.session);

      if (userId === decodedToken.id.toString()) {
        req.session = {
          userId: decodedToken.id,
          id: decodedToken.session,
        };
      }
    } catch (err) {
      logger.error(err);
    }
  }

  next();
};

export default getSessionMiddleware;
