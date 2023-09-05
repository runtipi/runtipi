import { getConfig } from '@/server/core/TipiConfig/TipiConfig';
import { TipiCache } from '@/server/core/TipiCache/TipiCache';
import { AuthQueries } from '@/server/queries/auth/auth.queries';
import { db } from '@/server/db';

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs-extra';

/**
 * API endpoint to get the self-signed certificate
 *
 * @param {NextApiRequest} req - The request
 * @param {NextApiResponse} res - The response
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authService = new AuthQueries(db);

  const sessionId = req.headers['x-session-id'];
  const cache = new TipiCache('certificate');
  const userId = await cache.get(`session:${sessionId}`);
  await cache.close();
  const user = await authService.getUserById(Number(userId));

  if (user?.operator) {
    const filePath = `${getConfig().rootFolder}/traefik/tls/cert.pem`;

    if (await fs.pathExists(filePath)) {
      const file = await fs.promises.readFile(filePath);

      res.setHeader('Content-Type', 'application/x-pem-file');
      res.setHeader('Content-Dispositon', 'attachment; filename=cert.pem');
      return res.send(file);
    }

    res.status(404).send('File not found');
  }

  return res.status(403).send('Forbidden');
}
