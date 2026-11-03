import { EncryptionModule } from '@/core/encryption/encryption.module';
import { PasswordModule } from '@/core/password/password.module';
import { UserModule } from '@/modules/user/user.module';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionManager } from './session.manager';

@Module({
  imports: [UserModule, EncryptionModule, PasswordModule],
  controllers: [AuthController],
  providers: [AuthService, SessionManager],
  // AuthMiddleware is applied in AppModule, so it can only inject providers that are exported here
  exports: [AuthService],
})
export class AuthModule {}
