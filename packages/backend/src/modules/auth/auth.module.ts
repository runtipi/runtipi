import { EncryptionModule } from '@/core/encryption/encryption.module';
import { UserModule } from '@/modules/user/user.module';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionManager } from './session.manager';

@Module({
  imports: [UserModule, EncryptionModule],
  controllers: [AuthController],
  providers: [AuthService, SessionManager],
})
export class AuthModule {}
