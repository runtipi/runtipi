import { EnvUtils } from '@/modules/env/env.utils.js';
import { Module } from '@nestjs/common';
import { ConfigurationService } from '../config/configuration.service.js';
import { EncryptionService } from './encryption.service.js';

@Module({
  providers: [ConfigurationService, EncryptionService, EnvUtils],
  exports: [EncryptionService],
})
export class EncryptionModule {}
