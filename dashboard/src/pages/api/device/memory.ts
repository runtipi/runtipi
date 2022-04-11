// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import si from 'systeminformation';

type Data = Awaited<ReturnType<typeof si.mem>>;

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
  const memory = await si.mem();

  res.status(200).json(memory);
};

export default handler;
