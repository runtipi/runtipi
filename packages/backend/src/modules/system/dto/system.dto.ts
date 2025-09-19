import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

const loadSchema = type({
  diskUsed: 'number | null = 0',
  diskSize: 'number | null = 0',
  percentUsed: 'number | null = 0',
  cpuLoad: 'number | null = 0',
  memoryTotal: 'number = 0',
  percentUsedMemory: 'number = 0',
});

// Load
export class LoadDto extends createArkDto(loadSchema, { name: 'LoadDto' }) {}
