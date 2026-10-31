import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { OIDCController } from '@/modules/oidc/oidc.controller';
import { OIDCRepository } from '@/modules/oidc/oidc.repository';
import { OIDCService } from '@/modules/oidc/oidc.service';

@Module({
  imports: [AuthModule],
  controllers: [OIDCController],
  providers: [OIDCService, OIDCRepository],
})
export class OIDCModule {}
