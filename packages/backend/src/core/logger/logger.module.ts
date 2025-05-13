import path from 'node:path';
import { DATA_DIR } from '@/common/constants.js';
import { Global, Module } from '@nestjs/common';
import { ConfigurationService } from '../config/configuration.service.js';
import { LoggerService } from './logger.service.js';

@Global()
@Module({
  imports: [],
  providers: [
    {
      provide: LoggerService,
      useFactory: (config: ConfigurationService) => new LoggerService('backend', path.join(DATA_DIR, 'logs'), config.get('userSettings').logLevel),
      inject: [ConfigurationService],
    },
  ],
  exports: [LoggerService],
})
export class LoggerModule {}
