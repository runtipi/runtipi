import { Injectable, NotFoundException } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppOperationsService, type LifecycleCommand } from '@/modules/app-lifecycle/services/app-operations.service';
import type { AgentIdentity } from '@/modules/agent-credentials/agent-credentials.service';

type OwnedOperation = { userId: number; urn: AppUrn; command: LifecycleCommand };

@Injectable()
export class McpOperationsService {
  private readonly owners = new Map<string, OwnedOperation>();

  constructor(private readonly operations: AppOperationsService) {}

  async start(identity: AgentIdentity, urn: AppUrn, command: LifecycleCommand, execute: () => Promise<{ requestId: string }>) {
    const { requestId } = await execute();
    return this.adopt(identity, urn, command, requestId);
  }

  adopt(identity: AgentIdentity, urn: AppUrn, command: LifecycleCommand, requestId: string) {
    for (const [id, owner] of this.owners) {
      if (!this.operations.get(owner.urn, id)) this.owners.delete(id);
    }
    this.owners.set(requestId, { userId: identity.user.id, urn, command });
    return { urn, operationId: requestId, requestId, status: this.operations.get(urn, requestId)?.status ?? 'unknown' };
  }

  get(userId: number, operationId: string) {
    const owner = this.owners.get(operationId);
    if (!owner || owner.userId !== userId) throw new NotFoundException('Operation unknown or expired');

    const operation = this.operations.get(owner.urn, operationId);
    if (!operation) throw new NotFoundException('Operation unknown or expired; completed history is retained in memory for one hour');

    return { ...operation, operationId, command: owner.command };
  }

  cancel(userId: number, operationId: string) {
    const operation = this.get(userId, operationId);
    this.operations.cancel(operation.urn, operation.requestId);
    return this.get(userId, operationId);
  }
}
