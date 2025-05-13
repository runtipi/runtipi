import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service.js';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
