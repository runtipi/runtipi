import { Module } from '@nestjs/common';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';
import { OidcRepository } from './oidc.repository';

@Module({
  imports: [],
  controllers: [OidcController],
  providers: [OidcService, OidcRepository],
})
export class OidcModule {}
