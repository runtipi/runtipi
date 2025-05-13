import { EncryptionModule } from '@/core/encryption/encryption.module.js';
import { UserModule } from '@/modules/user/user.module.js';
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionManager } from './session.manager.js';

@Module({
  imports: [UserModule, EncryptionModule],
  controllers: [AuthController],
  providers: [AuthService, SessionManager],
})
export class AuthModule {}
