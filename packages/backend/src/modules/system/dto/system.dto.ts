import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

const diskSchema = type({
  fs: 'string',
  mount: 'string',
  type: 'string',
  size: 'number',
  used: 'number',
  available: 'number',
  percentUsed: 'number',
});

const loadSchema = type({
  diskUsed: 'number = 0',
  diskSize: 'number = 0',
  percentUsed: 'number = 0',
  cpuLoad: 'number = 0',
  memoryTotal: 'number = 0',
  percentUsedMemory: 'number = 0',
  memoryUsedBytes: 'number = 0',
  memoryTotalBytes: 'number = 0',
  memorySource: type.enumerated('host', 'cgroup', 'containers'),
  cpuTemperature: 'number | null',
  networkRxBytesPerSec: 'number = 0',
  networkTxBytesPerSec: 'number = 0',
  disks: diskSchema.array(),
  timestamp: 'number',
});

const systemInfoSchema = type({
  hostname: 'string',
  os: 'string',
  kernel: 'string',
  architecture: 'string',
  dockerVersion: 'string',
  cpuModel: 'string',
  cpuCores: 'number',
  uptime: 'number',
});

const systemHistorySchema = type({
  interval: 'number',
  timestamps: 'number[]',
  cpu: 'number[]',
  memory: 'number[]',
  networkRx: 'number[]',
  networkTx: 'number[]',
});

const appDiskSchema = type({
  total: 'number',
  data: 'number',
  volumes: 'number',
  containers: 'number',
  images: 'number',
  shared: 'string[]',
  unmeasured: 'string[]',
});

const sharedStorageSchema = type({
  id: 'string',
  kind: type.enumerated('data', 'volume', 'image'),
  sources: 'string[]',
  size: 'number',
  apps: 'string[]',
});

const appsUsageSchema = type({
  interval: 'number',
  diskMeasuredAt: 'number | null',
  apps: type({
    id: 'string',
    containers: 'number',
    cpu: 'number',
    memory: 'number',
    networkRx: 'number',
    networkTx: 'number',
    disk: appDiskSchema.or('null'),
    history: {
      timestamps: 'number[]',
      cpu: 'number[]',
      memory: 'number[]',
    },
  }).array(),
  sharedStorage: sharedStorageSchema.array(),
});

// Load
export class LoadDto extends createArkDto(loadSchema, { name: 'LoadDto' }) {}
export class SystemInfoDto extends createArkDto(systemInfoSchema, { name: 'SystemInfoDto' }) {}
export class SystemHistoryDto extends createArkDto(systemHistorySchema, { name: 'SystemHistoryDto' }) {}
export class AppsUsageDto extends createArkDto(appsUsageSchema, { name: 'AppsUsageDto' }) {}
