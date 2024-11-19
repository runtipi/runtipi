import { Global, Module } from '@nestjs/common';
import { FilesystemService } from './filesystem.service';

@Global()
@Module({
  imports: [],
  providers: [FilesystemService],
  exports: [FilesystemService],
})
export class FilesystemModule {}
