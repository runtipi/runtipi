import { EnvModule } from '@/modules/env/env.module';
import { Global, Module } from '@nestjs/common';
import { ConfigurationService } from '../config/configuration.service';

@Global()
@Module({
  imports: [EnvModule],
  controllers: [],
  providers: [ConfigurationService],
  exports: [ConfigurationService],
})
export class ConfigurationModule {}
