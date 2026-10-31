import { ConfigurationService } from '@/core/config/configuration.service';
import { AgentCredentialsService, type AgentIdentity } from '@/modules/agent-credentials/agent-credentials.service';
import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Request } from 'express';

export type AgentRequest = Request & { agent: AgentIdentity };

@Injectable()
export class McpGuard implements CanActivate {
  constructor(
    private readonly credentials: AgentCredentialsService,
    private readonly config: ConfigurationService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AgentRequest>();
    if (process.env.RUNTIPI_MCP_ENABLED === 'false') throw new ServiceUnavailableException('MCP access is disabled');

    const settings = this.config.get('userSettings');
    const configuredHosts = [
      settings.domain,
      settings.localDomain,
      settings.internalIp,
      'localhost',
      '127.0.0.1',
      '[::1]',
      ...(process.env.RUNTIPI_MCP_ALLOWED_HOSTS ?? '').split(','),
    ];
    const allowedHosts = new Set(configuredHosts.filter(Boolean).map((host) => host.trim().toLowerCase()));

    const isAllowedHost = (host: string) => allowedHosts.has(host) || (process.env.NODE_ENV !== 'production' && host.endsWith('.localhost'));

    let hostname: string;
    try {
      const host = new URL(`http://${request.headers.host}`);
      if (host.username || host.password || host.pathname !== '/') throw new Error('Invalid host');
      hostname = host.hostname;
    } catch {
      throw new ForbiddenException('Invalid MCP host');
    }

    if (!isAllowedHost(hostname)) throw new ForbiddenException('MCP host is not configured for this instance');

    if (request.headers.origin) {
      try {
        const origin = new URL(request.headers.origin);
        if (!['http:', 'https:'].includes(origin.protocol) || !isAllowedHost(origin.hostname)) throw new Error('Invalid origin');
      } catch {
        throw new ForbiddenException('Invalid MCP origin');
      }
    }

    request.agent = await this.credentials.authenticate(request.headers.authorization);
    return true;
  }
}
