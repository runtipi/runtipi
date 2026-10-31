import { Injectable } from '@nestjs/common';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import type { Response } from 'express';
import type { AgentRequest } from './mcp.guard';
import { McpToolsService } from './mcp-tools.service';

@Injectable()
export class McpService {
  constructor(private readonly tools: McpToolsService) {}

  async handle(request: AgentRequest, response: Response) {
    const handler = createMcpHandler(() => this.tools.createServer(request.agent));

    try {
      await toNodeHandler(handler)(request, response, request.body);
    } finally {
      await handler.close();
    }
  }
}
