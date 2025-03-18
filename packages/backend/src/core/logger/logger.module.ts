import path from 'node:path';
import { DATA_DIR } from '@/common/constants';
import { Global, Module } from '@nestjs/common';
import { ConfigurationService } from '../config/configuration.service';
import { LoggerService } from './logger.service';

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
