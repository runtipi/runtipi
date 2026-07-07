import { Module } from '@nestjs/common';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';
import { OidcRepository } from './oidc.repository';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [OidcController],
  providers: [OidcService, OidcRepository],
})
export class OidcModule {}
