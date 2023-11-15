import { FileLogger } from '@runtipi/shared';
import path from 'node:path';

export const logger = new FileLogger('cli', path.join(process.cwd(), 'logs'));
