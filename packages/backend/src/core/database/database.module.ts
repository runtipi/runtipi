import { Global, Module } from '@nestjs/common';
import { DatabaseMigrator } from './database-migrator.service';
import { DatabaseService } from './database.service';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [DatabaseService, DatabaseMigrator],
  exports: [DatabaseService, DatabaseMigrator],
})
export class DatabaseModule {}
