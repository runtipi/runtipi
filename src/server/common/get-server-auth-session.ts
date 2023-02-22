import { type GetServerSidePropsContext } from 'next';
import jwt from 'jsonwebtoken';
import { getConfig } from '../core/TipiConfig';
import TipiCache from '../core/TipiCache';
import { Logger } from '../core/Logger';

export const getServerAuthSession = async (ctx: { req: GetServerSidePropsContext['req']; res: GetServerSidePropsContext['res'] }) => {
  const { req } = ctx;
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const decodedToken = jwt.verify(token, getConfig().jwtSecret) as { id: number; session: string };
      const userId = await TipiCache.get(decodedToken.session);

      if (userId === decodedToken.id.toString()) {
        return {
          userId: decodedToken.id,
          id: decodedToken.session,
        };
      }
    } catch (err) {
      Logger.info(err);
    }
  }

  return null;
};
