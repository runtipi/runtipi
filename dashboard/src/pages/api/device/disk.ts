// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import si from 'systeminformation';

type Data = Awaited<ReturnType<typeof si.fsSize>>;

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
  const disk = await si.fsSize();

  res.status(200).json(disk);
};

export default handler;
