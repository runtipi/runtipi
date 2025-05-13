import { Module } from '@nestjs/common';
import { EnvUtils } from './env.utils.js';

@Module({
  imports: [],
  providers: [EnvUtils],
  exports: [EnvUtils],
})
export class EnvModule {}
