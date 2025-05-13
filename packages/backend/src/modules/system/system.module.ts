import { Module } from '@nestjs/common';
import { SystemController } from './system.controller.js';
import { SystemService } from './system.service.js';

@Module({
  imports: [],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [],
})
export class SystemModule {}
