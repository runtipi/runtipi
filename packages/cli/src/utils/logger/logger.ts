import { FileLogger } from '@runtipi/shared/node';
import path from 'node:path';

export const logger = new FileLogger('cli', path.join(process.cwd(), 'logs'));
