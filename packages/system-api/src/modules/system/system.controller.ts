import { Request, Response } from 'express';
import { getConfig } from '../../core/config/TipiConfig';

const status = async (req: Request, res: Response) => {
  res.status(200).json({
    status: getConfig().status,
  });
};

export default {
  status,
};
