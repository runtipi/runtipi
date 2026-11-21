import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { McpGuard, type AgentRequest } from './mcp.guard';
import { McpService } from './mcp.service';

@ApiExcludeController()
@UseGuards(McpGuard)
@Controller('mcp')
export class McpController {
  constructor(private readonly mcp: McpService) {}

  @All()
  async handleMcp(@Req() request: AgentRequest, @Res() response: Response) {
    await this.mcp.handle(request, response);
  }
}
