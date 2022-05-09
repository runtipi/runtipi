import { Request, Response } from 'express';
import publicIp from 'public-ip';
import portScanner from 'node-port-scanner';
import internalIp from 'internal-ip';

const isPortOpen = async (req: Request, res: Response<boolean>) => {
  const { port } = req.params;

  const host = await publicIp.v4();

  const isOpen = await portScanner(host, [port]);

  res.status(200).send(isOpen);
};

const getInternalIp = async (req: Request, res: Response<string>) => {
  const ip = await internalIp.v4();

  res.status(200).send(ip);
};

const NetworkController = {
  isPortOpen,
  getInternalIp,
};

export default NetworkController;
