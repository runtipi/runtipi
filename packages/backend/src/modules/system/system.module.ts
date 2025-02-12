import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { CacheModule } from '@/core/cache/cache.module';

@Module({
  imports: [CacheModule],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [],
})
export class SystemModule {}
