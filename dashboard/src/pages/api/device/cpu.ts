// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import si from 'systeminformation';

type Data = Awaited<ReturnType<typeof si.currentLoad>>;

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
  const cpuLoad = await si.currentLoad();

  res.status(200).json(cpuLoad);
};

export default handler;
