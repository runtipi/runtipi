import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { DATA_DIR } from '@/common/constants';
import path from 'node:path';
import { ConfigurationService } from '../config/configuration.service';

@Global()
@Module({
  imports: [],
  providers: [
    {
      provide: LoggerService,
      useFactory: (configurationService: ConfigurationService) => new LoggerService('backend', path.join(DATA_DIR, 'logs'), configurationService),
      inject: [ConfigurationService],
    },
  ],
  exports: [LoggerService],
})
export class LoggerModule {}
