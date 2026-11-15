import type { LoggerService } from '@/core/logger/logger.service';
import * as Sentry from '@sentry/nestjs';
import { AMQPConnectionError, AMQPError, type Connection, type RPCClient } from 'rabbitmq-client';
import { type } from 'arktype';
import { scheduleCron, validateCronPattern } from './cron-scheduler';
import type { EventPublisher } from './event.publisher';

export type ArkTypeSchema<TOut = unknown, TIn = unknown> = {
  (data: TIn): TOut | type.errors;
  infer: TOut;
  inferIn?: TIn;
};

type Infer<T extends { infer: unknown }> = T['infer'];
type Completion<T> = { promise: Promise<T>; resolve: (value: T) => void; started: boolean; settledAt?: number };

type InferIn<T extends { infer: unknown; inferIn?: unknown }> = T extends { inferIn: infer I } ? I : T['infer'];

export class Queue<T extends ArkTypeSchema, R extends ArkTypeSchema<{ success: boolean; message: string }>> {
  private readonly completions = new Map<string, Completion<Infer<R>>>();

  constructor(
    private rabbit: Connection,
    private rpcClient: RPCClient,
    private publisher: EventPublisher,
    private queueName: string,
    private workers: number,
    private eventSchema: T,
    private resultSchema: R,
    private logger: LoggerService,
    private waitForConsumer = false,
  ) {}

  public onEvent(callback: (data: Infer<T> & { eventId: string }, reply: (response: InferIn<R>) => Promise<void>) => Promise<void>) {
    try {
      this.rabbit.createConsumer(
        {
          queue: this.queueName,
          concurrency: this.workers,
          queueOptions: { autoDelete: false, durable: true },
        },
        async (req, reply) => {
          let rpcSuccess = false;
          let rpcResultMessage = '';
          const completion = this.waitForConsumer ? this.completions.get(req.body.requestId) : undefined;
          if (this.waitForConsumer && !completion) {
            await reply({ success: false, message: 'This queued request has expired. Submit a new operation.' });
            return;
          }
          let consumerResult: Infer<R> | undefined;

          const respond = async (result: InferIn<R>) => {
            if (!this.waitForConsumer) return reply(result);

            const validated = this.resultSchema(result as never);
            if (validated instanceof type.errors) throw new Error(`Invalid response schema: ${validated.summary}`);
            consumerResult ??= validated;

            try {
              await reply(result);
            } catch (error) {
              this.logger.error('Could not deliver the RPC reply for a completed command:', error);
            }
          };

          try {
            if (completion?.started) {
              await respond((await completion.promise) as InferIn<R>);
            } else {
              if (completion) completion.started = true;
              await callback(req.body, respond);
            }
            rpcSuccess = true;
            rpcResultMessage = 'RPC processed successfully.';
          } catch (error) {
            this.logger.error('Error in consumer callback:', error);
            await respond({ success: false, message: error instanceof Error ? error.message : String(error) } as InferIn<R>);
            rpcSuccess = false;
            rpcResultMessage = error instanceof Error ? error.message : String(error);
          } finally {
            if (completion && consumerResult !== undefined && completion.settledAt === undefined) {
              completion.settledAt = Date.now();
              completion.resolve(consumerResult);
              this.pruneCompletions();
            }

            const eventToPublish = {
              queueName: this.queueName,
              requestData: req.body,
              rpcStatus: rpcSuccess ? 'success' : 'failure',
              rpcMessage: rpcResultMessage,
              requestId: req.body.requestId,
              timestamp: new Date().toISOString(),
            };

            const routingKey = `rpc.${rpcSuccess ? 'processed' : 'error'}.${this.queueName}`;
            await this.publisher.publish(routingKey, eventToPublish);
          }
        },
      );
    } catch (error) {
      this.logger.error(`Failed to create consumer for queue ${this.queueName}:`, error);
      Sentry.captureException(error, { tags: { queueName: this.queueName, action: 'onEvent' } });
      throw error;
    }
  }

  async publish(event: unknown): Promise<{ success: boolean; message: string } | Infer<R>> {
    try {
      const eventData = this.eventSchema(event as never);
      if (eventData instanceof type.errors) throw new Error(`Invalid event data: ${eventData.summary}`);

      let completion: Completion<Infer<R>> | undefined;
      if (this.waitForConsumer) {
        if (typeof eventData !== 'object' || eventData === null || !('requestId' in eventData) || typeof eventData.requestId !== 'string') {
          throw new Error('Consumer-tracked events require a request ID');
        }
        this.pruneCompletions();
        const existing = this.completions.get(eventData.requestId);
        if (existing) return await existing.promise;
        completion = this.completionFor(eventData.requestId);
      }

      const rpc = Promise.resolve().then(async () => {
        const res = await this.rpcClient.send(this.queueName, eventData);
        const response = this.resultSchema(res.body as never);
        if (response instanceof type.errors) throw new Error(`Invalid response schema: ${response.summary}`);

        return response;
      });
      if (completion) {
        // Fence unstarted requests so late delivery cannot execute after a caller retries.
        void rpc.catch((error) => {
          const failure = this.reportPublishError(error);
          if (!completion.started) {
            completion.started = true;
            completion.settledAt = Date.now();
            const result = this.resultSchema(failure as never);
            if (!(result instanceof type.errors)) completion.resolve(result);
            this.pruneCompletions();
          }
        });
        return await completion.promise;
      }

      return await rpc;
    } catch (error) {
      return this.reportPublishError(error);
    }
  }

  private completionFor(requestId: string): Completion<Infer<R>> {
    this.pruneCompletions();
    const existing = this.completions.get(requestId);
    if (existing) return existing;

    let resolve!: (result: Infer<R>) => void;
    const promise = new Promise<Infer<R>>((complete) => {
      resolve = complete;
    });
    const completion = { promise, resolve, started: false };
    this.completions.set(requestId, completion);

    return completion;
  }

  private pruneCompletions() {
    const completed = [...this.completions].flatMap(([id, { settledAt }]) => {
      if (settledAt === undefined) return [];
      return [{ id, settledAt }];
    });
    completed.sort((a, b) => a.settledAt - b.settledAt);

    for (const [index, { id, settledAt }] of completed.entries()) {
      if (Date.now() - settledAt > 60 * 60 * 1000 || index < completed.length - 1000) this.completions.delete(id);
    }
  }

  private reportPublishError(err: unknown) {
    if (err instanceof AMQPConnectionError) {
      this.logger.error('Connection to the queue was lost. Try restarting your instance before retrying.');
    }

    if (err instanceof AMQPError) {
      if (err.code === 'RPC_TIMEOUT') {
        this.logger.error('The queue timed out while processing the request. Try restarting your instance before retrying.');
      }
      return { success: false, message: err.message };
    }

    Sentry.captureException(err, { tags: { queueName: this.queueName } });
    return { success: false, message: String(err) };
  }

  public publishRepeatable(data: unknown, cronPattern: string) {
    if (!validateCronPattern(cronPattern)) {
      throw new Error('Invalid cron pattern');
    }

    const eventData = this.eventSchema(data as never);
    if (eventData instanceof type.errors) {
      throw new Error(`Invalid event data: ${eventData.summary}`);
    }

    scheduleCron(cronPattern, async () => {
      try {
        await this.rpcClient.send(this.queueName, eventData);
      } catch (e) {
        Sentry.captureException(e, { tags: { queueName: this.queueName } });
        this.logger.error('Error in cron job:', e);
      }
    });
  }
}
