import path from 'node:path';
import { DATA_DIR } from '@/common/constants';
import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Global()
@Module({
  imports: [],
  providers: [
    {
      provide: LoggerService,
      useFactory: () => new LoggerService('backend', path.join(DATA_DIR, 'logs')),
    },
  ],
  exports: [LoggerService],
})
export class LoggerModule {}
