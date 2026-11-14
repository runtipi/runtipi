import { DatabaseSync } from 'node:sqlite';
import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [{ provide: CacheService, useFactory: () => new CacheService(new DatabaseSync('/cache/cache.sqlite')) }],
  exports: [CacheService],
})
export class CacheModule {}
