import { Module } from '@nestjs/common';
import { SubnetManagerService } from './subnet-manager.service';
import { AppsModule } from '../apps/apps.module';

@Module({
  imports: [AppsModule],
  controllers: [],
  providers: [SubnetManagerService],
  exports: [SubnetManagerService],
})
export class NetworkModule {}
