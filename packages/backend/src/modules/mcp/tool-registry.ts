import { describeError } from '@/common/error/diagnostic-error';
import { randomUUID } from 'node:crypto';
import { TranslatableError } from '@/common/error/translatable-error';
import { HttpException } from '@nestjs/common';
import { McpServer, type StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import type { AgentIdentity } from '../agent-credentials/agent-credentials.service';
import type { LoggerService } from '@/core/logger/logger.service';

type InputSchema<T> = StandardSchemaWithJSON<unknown, T> & { onUndeclaredKey(behavior: 'reject'): StandardSchemaWithJSON<unknown, T> };

const auditTarget = (input: unknown) => {
  if (typeof input !== 'object' || input === null) return undefined;
  if ('urn' in input && typeof input.urn === 'string') return input.urn;
  if ('operationId' in input && typeof input.operationId === 'string') return input.operationId;
  if ('id' in input && typeof input.id === 'number') return input.id;
  return undefined;
};

export class ToolRegistry {
  constructor(
    readonly server: McpServer,
    private readonly identity: AgentIdentity,
    private readonly logger: LoggerService,
  ) {}

  add<Input, Output extends Record<string, unknown>>(
    name: string,
    description: string,
    inputSchema: InputSchema<Input>,
    outputSchema: StandardSchemaWithJSON<unknown, Output>,
    execute: (input: Input) => Output | Promise<Output>,
    readOnly = false,
  ) {
    this.server.registerTool(
      name,
      {
        description,
        inputSchema: inputSchema.onUndeclaredKey('reject'),
        outputSchema,
        annotations: { readOnlyHint: readOnly, destructiveHint: !readOnly, idempotentHint: readOnly, openWorldHint: true },
      },
      async (input) => {
        const context = { userId: this.identity.user.id, credentialId: this.identity.credentialId, tool: name, target: auditTarget(input) };
        try {
          const result = await execute(input);
          const wireValue: unknown = JSON.parse(JSON.stringify(result));
          const validated = await outputSchema['~standard'].validate(wireValue);
          if (validated.issues) throw Object.assign(new Error('Tool output did not match its declared schema'), { code: 'MCP_INVALID_OUTPUT' });
          const output = validated.value;

          this.logger.info('MCP tool completed', context);
          return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output };
        } catch (error) {
          const diagnosticId = randomUUID();
          this.logger.warn('MCP tool failed', { ...context, diagnosticId, ...describeError(error) });

          let message = `The operation failed. Check the instance logs using diagnostic ID ${diagnosticId}.`;
          if (error instanceof TranslatableError) message = JSON.stringify(error.getResponse());
          else if (error instanceof HttpException && error.getStatus() < 500) message = error.message;

          return { isError: true, content: [{ type: 'text', text: message }], structuredContent: { error: { message, diagnosticId } } };
        }
      },
    );
  }
}
