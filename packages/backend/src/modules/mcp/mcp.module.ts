import { McpSystemTools } from './system-tools';
import { McpAccountTools } from './account-tools';
import { McpBackupTools } from './backup-tools';
import { McpAppConfigurationTools } from './app-configuration-tools';
import { McpMarketplaceTools } from './marketplace-tools';
import { McpAppTools } from './app-tools';
import { Module } from '@nestjs/common';
import { AgentCredentialsModule } from '../agent-credentials/agent-credentials.module';
import { AppsModule } from '../apps/apps.module';
import { AppLifecycleModule } from '../app-lifecycle/app-lifecycle.module';
import { AppStoreModule } from '../app-stores/app-store.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { CustomAppsModule } from '../custom-apps/custom-apps.module';
import { AppConfigModule } from '../app-config/app-config.module';
import { UserConfigModule } from '../user-config/user-config.module';
import { BackupsModule } from '../backups/backups.module';
import { DockerModule } from '../docker/docker.module';
import { LinksModule } from '../links/links.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { SystemModule } from '../system/system.module';
import { SSEModule } from '@/core/sse/sse.module';
import { EnvModule } from '../env/env.module';
import { McpAppsService } from './mcp-apps.service';
import { McpGuard } from './mcp.guard';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { McpToolsService } from './mcp-tools.service';
import { McpOperationsService } from './mcp-operations.service';
import { McpTransfersController } from './mcp-transfers.controller';

@Module({
  imports: [
    AgentCredentialsModule,
    AppsModule,
    EnvModule,
    AppLifecycleModule,
    AppStoreModule,
    MarketplaceModule,
    CustomAppsModule,
    AppConfigModule,
    UserConfigModule,
    BackupsModule,
    DockerModule,
    LinksModule,
    AuthModule,
    UserModule,
    SystemModule,
    SSEModule,
  ],
  controllers: [McpController, McpTransfersController],
  providers: [
    McpGuard,
    McpService,
    McpToolsService,
    McpOperationsService,
    McpAppsService,
    McpAppTools,
    McpMarketplaceTools,
    McpAppConfigurationTools,
    McpBackupTools,
    McpAccountTools,
    McpSystemTools,
  ],
})
export class McpModule {}
