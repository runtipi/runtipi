import { CacheModule } from '@/core/cache/cache.module';
import { PasswordConfirmationService } from './password-confirmation.service';
import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';

@Module({
  imports: [CacheModule],
  providers: [PasswordService, PasswordConfirmationService],
  exports: [PasswordService, PasswordConfirmationService],
})
export class PasswordModule {}
