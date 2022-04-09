import { Request, Response } from 'express';
import si from 'systeminformation';

type CpuData = {
  load: number;
};

type DiskData = {
  size: number;
  used: number;
  available: number;
};

type MemoryData = {
  total: number;
  free: number;
  used: number;
};

/**
 *
 * @param req
 * @param res
 */
const getCpuInfo = async (req: Request, res: Response<CpuData>) => {
  //   const cpuInfo = await cpu.getCpuInfo();
  const cpuLoad = await si.currentLoad();

  res.status(200).send({ load: cpuLoad.currentLoad });
};

/**
 *
 * @param req
 * @param res
 */
const getDiskInfo = async (req: Request, res: Response<DiskData>) => {
  const disk = await si.fsSize();

  const rootDisk = disk.find((item) => item.mount === '/');

  if (!rootDisk) {
    throw new Error('Could not find root disk');
  }

  const result: DiskData = {
    size: rootDisk.size,
    used: rootDisk.used,
    available: rootDisk.available,
  };

  res.status(200).send(result);
};

/**
 *
 * @param req
 * @param res
 */
const getMemoryInfo = async (req: Request, res: Response<MemoryData>) => {
  const memory = await si.mem();

  const result: MemoryData = {
    total: memory.total,
    free: memory.free,
    used: memory.used,
  };

  res.status(200).json(result);
};

export default { getCpuInfo, getDiskInfo, getMemoryInfo };
