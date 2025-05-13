import { EnvModule } from '@/modules/env/env.module.js';
import { Global, Module } from '@nestjs/common';
import { ConfigurationService } from '../config/configuration.service.js';

@Global()
@Module({
  imports: [EnvModule],
  controllers: [],
  providers: [ConfigurationService],
  exports: [ConfigurationService],
})
export class ConfigurationModule {}
