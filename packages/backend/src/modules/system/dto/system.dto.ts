import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

const loadSchema = type({
  diskUsed: 'number = 0',
  diskSize: 'number = 0',
  percentUsed: 'number = 0',
  cpuLoad: 'number = 0',
  memoryTotal: 'number = 0',
  percentUsedMemory: 'number = 0',
});

// Load
export class LoadDto extends createArkDto(loadSchema, { name: 'LoadDto' }) {}
