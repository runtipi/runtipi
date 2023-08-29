import { db } from '@/server/db';

import { NextApiRequest, NextApiResponse } from 'next';
import { AppServiceClass } from '@/server/services/apps/apps.service';

/**
 * API endpoint to start all apps
 *
 * @param  {NextApiRequest} _ - The request
 * @param {NextApiResponse} res - The response
 */
export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  const appsService = new AppServiceClass(db);

  appsService.startAllApps();

  return res.status(200).send('OK');
}
