import fs from 'fs';
import { getConfig } from '@/server/core/TipiConfig/TipiConfig';
import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

/**
 * API endpoint to get the image of an app
 *
 * @param {NextApiRequest} req - The request
 * @param {NextApiResponse} res - The response
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (typeof req.query.id !== 'string') {
    res.status(404).send('Not found');
    return;
  }

  try {
    const filePath = path.join(getConfig().rootFolder, 'repos', getConfig().appsRepoId, 'apps', req.query.id, 'metadata', 'logo.jpg');
    const file = fs.readFileSync(filePath);

    res.setHeader('Content-Type', 'image/jpeg');
    res.send(file);
  } catch (e) {
    res.status(404).send('Not found');
  }
}
