import axios from 'axios';
import { Request, Response } from 'express';
import config from '../../config';
import TipiCache from '../../config/TipiCache';
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
const getCpuInfo = async (_req: Request, res: Response<CpuData>) => {
  const systemInfo: SystemInfo = readJsonFile('/state/system-info.json');

  const cpu = systemInfo.cpu;

  res.status(200).send({ load: cpu.load });
};

/**
 *
 * @param req
 * @param res
 */
const getDiskInfo = async (_req: Request, res: Response<DiskData>) => {
  const systemInfo: SystemInfo = readJsonFile('/state/system-info.json');

  const result: DiskData = systemInfo.disk;

  res.status(200).send(result);
};

/**
 *
 * @param req
 * @param res
 */
const getMemoryInfo = async (_req: Request, res: Response<MemoryData>) => {
  const systemInfo: SystemInfo = readJsonFile('/state/system-info.json');

  const result: MemoryData = systemInfo.memory;

  res.status(200).json(result);
};

const getVersion = async (_req: Request, res: Response<{ current: string; latest?: string }>) => {
  let version = TipiCache.get<string>('latestVersion');

  if (!version) {
    const { data } = await axios.get('https://api.github.com/repos/meienberger/runtipi/releases/latest');

    TipiCache.set('latestVersion', data.name);
    version = data.name.replace('v', '');
  }

  TipiCache.set('latestVersion', version?.replace('v', ''));

  res.status(200).send({ current: config.VERSION, latest: version?.replace('v', '') });
};

export default { getCpuInfo, getDiskInfo, getMemoryInfo, getVersion };
