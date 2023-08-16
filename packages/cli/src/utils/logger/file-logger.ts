import { createLogger } from '@runtipi/shared';
import path from 'path';

export const fileLogger = createLogger('cli', path.join(process.cwd(), 'logs'));
