import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service.js';

export const DATABASE = 'DATABASE_INSTANCE';
export type Database = DatabaseService['db'];

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [
    DatabaseService,
    {
      provide: DATABASE,
      useFactory: (databaseService: DatabaseService): Database => databaseService.db,
      inject: [DatabaseService],
    },
  ],
  exports: [DatabaseService, DATABASE],
})
export class DatabaseModule {}
