import { Request, Response } from "express";
import publicIp from "public-ip";
import portScanner from "node-port-scanner";

const isPortOpen = async (req: Request, res: Response<boolean>) => {
  const port = req.params.port;

  const host = await publicIp.v4();

  const isOpen = await portScanner(host, [port]);

  console.log(port);

  res.status(200).send(isOpen);
};
