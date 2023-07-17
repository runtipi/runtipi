import { mainRouter } from '@/server/routers/_app';
import type { NextApiRequest, NextApiResponse } from 'next';
import { renderTrpcPanel } from 'trpc-panel';

/**
 *
 * @param _
 * @param res
 */
export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  res.status(200).send(
    renderTrpcPanel(mainRouter, {
      url: 'http://localhost:3000/api/trpc',
      transformer: 'superjson',
    }),
  );
}
