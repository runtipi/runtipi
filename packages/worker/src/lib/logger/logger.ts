import { Logger } from '@runtipi/shared/node';
import path from 'node:path';
import { DATA_DIR } from '@/config/constants';

export const logger = new Logger('worker', path.join(DATA_DIR, 'logs'));
