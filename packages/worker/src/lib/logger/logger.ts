import { DATA_DIR } from '@/config/constants';
import { FileLogger } from '@runtipi/shared/node';
import path from 'node:path';

export const logger = new FileLogger('worker', path.join(DATA_DIR, 'logs'), true);
