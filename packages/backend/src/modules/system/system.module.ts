import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [],
})
export class SystemModule {}
