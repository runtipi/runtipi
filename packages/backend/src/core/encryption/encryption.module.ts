import { EnvUtils } from '@/modules/env/env.utils';
import { Module } from '@nestjs/common';
import { ConfigurationService } from '../config/configuration.service';
import { EncryptionService } from './encryption.service';

@Module({
  providers: [ConfigurationService, EncryptionService, EnvUtils],
  exports: [EncryptionService],
})
export class EncryptionModule {}
