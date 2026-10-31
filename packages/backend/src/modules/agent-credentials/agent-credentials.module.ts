import { Module } from '@nestjs/common';
import { PasswordModule } from '@/core/password/password.module';
import { UserModule } from '../user/user.module';
import { AgentCredentialsController } from './agent-credentials.controller';
import { AgentCredentialsService } from './agent-credentials.service';

@Module({
  imports: [PasswordModule, UserModule],
  controllers: [AgentCredentialsController],
  providers: [AgentCredentialsService],
  exports: [AgentCredentialsService],
})
export class AgentCredentialsModule {}
