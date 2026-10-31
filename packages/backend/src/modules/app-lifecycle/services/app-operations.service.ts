import { describeError } from '@/common/error/diagnostic-error';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { LoggerService } from '@/core/logger/logger.service';
import { AppJobService } from './app-job.service';

export type LifecycleCommand = 'install' | 'start' | 'stop' | 'restart' | 'reset' | 'uninstall' | 'update' | 'backup' | 'restore';
export type OperationResult = { success: boolean; message: string };
export type LifecycleOperation = {
  requestId: string;
  urn: AppUrn;
  command: LifecycleCommand;
  status: 'accepted' | 'queued' | 'running' | 'cancelling' | 'succeeded' | 'failed' | 'cancelled';
  phase: string;
  message: string;
  cancellable: boolean;
  createdAt: number;
  updatedAt: number;
};

type Entry = { operation: LifecycleOperation; completion: Promise<OperationResult> };
const retention = 60 * 60 * 1000;
export const isOperationActive = (operation: LifecycleOperation) =>
  operation.status === 'accepted' || operation.status === 'queued' || operation.status === 'running' || operation.status === 'cancelling';

@Injectable()
export class AppOperationsService {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly jobs: AppJobService,
    private readonly logger: LoggerService,
  ) {}

  submit(urn: AppUrn, command: LifecycleCommand, requestId: string, task: (progress: (phase: string) => void) => Promise<OperationResult>) {
    for (const [id, { operation }] of this.entries) {
      if (!isOperationActive(operation) && Date.now() - operation.updatedAt > retention) this.entries.delete(id);
    }

    const now = Date.now();
    const operation: LifecycleOperation = {
      requestId,
      urn,
      command,
      status: 'accepted',
      phase: 'queued',
      message: 'Waiting for the lifecycle worker',
      cancellable: false,
      createdAt: now,
      updatedAt: now,
    };
    const completion = Promise.resolve().then(async () => {
      operation.status = 'running';
      operation.phase = command;
      operation.updatedAt = Date.now();

      let result: OperationResult;
      try {
        result = await task((phase) => {
          operation.phase = phase;
          operation.updatedAt = Date.now();
        });
      } catch (error) {
        this.logger.error('Lifecycle completion failed', { requestId, urn, command, ...describeError(error) });
        result = { success: false, message: 'Lifecycle post-processing failed. Check the instance logs.' };
      }

      operation.status = result.success ? 'succeeded' : 'failed';
      operation.phase = 'finished';
      operation.message = result.message;
      operation.updatedAt = Date.now();
      const completed = [...this.entries].filter(([, entry]) => !isOperationActive(entry.operation));
      completed.sort((a, b) => a[1].operation.updatedAt - b[1].operation.updatedAt);
      for (const [id] of completed.slice(0, Math.max(0, completed.length - 1000))) this.entries.delete(id);
      return result;
    });

    this.entries.set(requestId, { operation, completion });
    return { requestId };
  }

  get(urn: AppUrn, requestId: string): LifecycleOperation | null {
    const entry = this.entries.get(requestId);
    if (entry?.operation.urn === urn) {
      if (!isOperationActive(entry.operation) && Date.now() - entry.operation.updatedAt > retention) {
        this.entries.delete(requestId);
        return null;
      }
      return { ...entry.operation };
    }

    const job = this.jobs.getJob(urn, requestId);
    if (!job || (!['queued', 'running', 'cancelling'].includes(job.status) && Date.now() - job.updatedAt > retention)) return null;

    return {
      requestId: job.requestId,
      urn,
      command: job.command,
      status: job.status,
      phase: job.phase,
      message: job.message,
      cancellable: job.cancellable,
      createdAt: job.startedAt,
      updatedAt: job.updatedAt,
    };
  }

  waitFor(requestId: string) {
    const entry = this.entries.get(requestId);
    if (!entry) throw new NotFoundException('Lifecycle operation unknown or expired');

    return entry.completion;
  }

  assertIdle(urn: AppUrn) {
    this.jobs.assertIdle(urn);
    if ([...this.entries.values()].some(({ operation }) => operation.urn === urn && isOperationActive(operation))) {
      throw new ConflictException('This app already has an active lifecycle operation');
    }
  }

  cancel(urn: AppUrn, requestId: string) {
    const operation = this.get(urn, requestId);
    if (!operation?.cancellable) throw new ConflictException('This operation cannot currently be cancelled');

    this.jobs.cancel(urn, requestId);
    return this.get(urn, requestId);
  }
}
