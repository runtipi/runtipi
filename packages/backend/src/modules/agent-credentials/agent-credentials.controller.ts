import { Body, Controller, Delete, Get, Header, Param, Post, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AgentCredentialsDto, CreateAgentCredentialBody, CreatedAgentCredentialDto } from './agent-credentials.dto';
import { AgentCredentialsService } from './agent-credentials.service';

@UseGuards(AuthGuard)
@Controller('agent-credentials')
export class AgentCredentialsController {
  constructor(private readonly credentials: AgentCredentialsService) {}

  private userId(req: Request) {
    if (req.authMethod !== 'session' || !req.user) throw new UnauthorizedException('A dashboard session is required');
    return req.user.id;
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiResponse({ type: AgentCredentialsDto })
  async listAgentCredentials(@Req() req: Request) {
    return { credentials: await this.credentials.list(this.userId(req)) };
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiResponse({ type: CreatedAgentCredentialDto })
  async createAgentCredential(@Req() req: Request, @Body() body: CreateAgentCredentialBody) {
    return this.credentials.create(this.userId(req), body);
  }

  @Delete(':id')
  async revokeAgentCredential(@Req() req: Request, @Param('id') id: string) {
    await this.credentials.revoke(this.userId(req), id);
    return { success: true };
  }
}
