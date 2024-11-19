import { Module } from '@nestjs/common';
import { EnvUtils } from './env.utils';

@Module({
  imports: [],
  providers: [EnvUtils],
  exports: [EnvUtils],
})
export class EnvModule {}
