import { Module } from '@nestjs/common';
import { ArchiveService } from './archive.service.js';

@Module({
  imports: [],
  providers: [ArchiveService],
  exports: [ArchiveService],
})
export class ArchiveModule {}
