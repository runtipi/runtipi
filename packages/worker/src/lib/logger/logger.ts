import { FileLogger } from '@runtipi/shared';
import path from 'node:path';

export const logger = new FileLogger('worker', path.join('/app', 'logs'), true);
