import { Request, Response } from 'express';
import fetch from 'node-fetch';
import config from '../../config';
import TipiCache from '../../config/cache';
import { readJsonFile } from '../fs/fs.helpers';

type CpuData = {
  load: number;
};

type DiskData = {
  total: number;
  used: number;
  available: number;
};

type MemoryData = {
  total: number;
  available: number;
  used: number;
};

type SystemInfo = {
  cpu: CpuData;
  disk: DiskData;
  memory: MemoryData;
};

/**
 *
 * @param req
 * @param res
 */
const getCpuInfo = async (req: Request, res: Response<CpuData>) => {
  const systemInfo: SystemInfo = readJsonFile('/state/system-info.json');

  const cpu = systemInfo.cpu;

  res.status(200).send({ load: cpu.load });
};

/**
 *
 * @param req
 * @param res
 */
const getDiskInfo = async (req: Request, res: Response<DiskData>) => {
  const systemInfo: SystemInfo = readJsonFile('/state/system-info.json');

  const result: DiskData = systemInfo.disk;

  res.status(200).send(result);
};

/**
 *
 * @param req
 * @param res
 */
const getMemoryInfo = async (req: Request, res: Response<MemoryData>) => {
  const systemInfo: SystemInfo = readJsonFile('/state/system-info.json');

  const result: MemoryData = systemInfo.memory;

  res.status(200).json(result);
};

const getVersion = async (_: Request, res: Response<{ current: string; latest: string }>) => {
  let version = TipiCache.get<string>('latestVersion');

  if (!version) {
    const response = await fetch('https://api.github.com/repos/meienberger/runtipi/releases/latest');
    const json = (await response.json()) as { name: string };
    TipiCache.set('latestVersion', json.name);
    version = json.name.replace('v', '');
  }

  TipiCache.set('latestVersion', version.replace('v', ''));

  res.status(200).send({ current: config.VERSION, latest: version.replace('v', '') });
};

export default { getCpuInfo, getDiskInfo, getMemoryInfo, getVersion };
