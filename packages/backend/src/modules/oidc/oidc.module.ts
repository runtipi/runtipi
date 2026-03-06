import { Module } from '@nestjs/common';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';
import { OidcRepository } from './oidc.repository';
import { AuthService } from '../auth/auth.service';
import { UserRepository } from '../user/user.repository';
import { SessionManager } from '../auth/session.manager';
import { EncryptionService } from '@/core/encryption/encryption.service';
import { PasswordService } from '@/core/password/password.service';

@Module({
  imports: [],
  controllers: [OidcController],
  providers: [OidcService, OidcRepository, AuthService, UserRepository, SessionManager, EncryptionService, PasswordService],
})
export class OidcModule {}
