import type { LoggerService } from '@/core/logger/logger.service';
import * as Sentry from '@sentry/nestjs';
import cron from 'node-cron';
import { AMQPConnectionError, AMQPError, type Connection, type RPCClient } from 'rabbitmq-client';
import { type } from 'arktype';
import type { EventPublisher } from './event.publisher';
import type { EventsType } from './dto/queue.dto';

interface EventDetails {
  queueName: string;
  expiration?: number;
  timestamp?: number;
  cancel: () => Promise<void>;
  caller?: string;
}

export type ArkTypeSchema<TOut = unknown, TIn = unknown> = {
  (data: TIn): TOut | type.errors;
  infer: TOut;
  inferIn?: TIn;
};

type Infer<T extends { infer: unknown }> = T['infer'];
type InferIn<T extends { infer: unknown; inferIn?: unknown }> = T extends { inferIn: infer I } ? I : T['infer'];

export class Queue<T extends ArkTypeSchema, R extends ArkTypeSchema<{ success: boolean; message: string }>> {
  private events: Map<string, EventDetails> = new Map();

  constructor(
    private rabbit: Connection,
    private rpcClient: RPCClient,
    private publisher: EventPublisher,
    private queueName: string,
    private workers: number,
    private eventSchema: T,
    private resultSchema: R,
    private logger: LoggerService,
  ) {}

  public onEvent(
    callback: (
      data: Infer<T> & { eventId: string },
      reply: (response: InferIn<R>) => Promise<void>,
      // biome-ignore lint/suspicious/noExplicitAny: false positive
      registerReject: (reject: (reason?: any) => void) => void,
    ) => Promise<void>,
  ) {
    try {
      this.rabbit.createConsumer({ queue: this.queueName, concurrency: this.workers }, async (req, reply) => {
        let rpcSuccess = false;
        let rpcResultMessage = '';
        // biome-ignore lint/suspicious/noExplicitAny: false positive
        let reject: ((reason?: any) => void) | null = null;

        // biome-ignore lint/suspicious/noExplicitAny: false positive
        function registerReject(rejectFn: (reason?: any) => void) {
          reject = rejectFn;
        }

        if (req.body.requestId !== undefined) {
          this.events.set(req.body.requestId, {
            queueName: req.routingKey,
            expiration: Number.parseInt(req.expiration ?? '0', 10),
            timestamp: req.timestamp ?? undefined,
            cancel: async () => {
              reject?.(new Error('RPC cancelled'));
              await reply({ success: false, message: 'RPC cancelled' });
            },
            caller: req.body.appUrn ?? 'system',
          });
        }

        try {
          await callback(req.body, reply, registerReject);
          rpcSuccess = true;
          rpcResultMessage = 'RPC processed successfully.';
        } catch (error) {
          this.logger.error('Error in consumer callback:', error);
          await reply({ success: false, message: (error as Error)?.message } as InferIn<R>);
          rpcSuccess = false;
          rpcResultMessage = error instanceof Error ? error.message : String(error);
        } finally {
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

          this.events.delete(req.body.requestId);
        }
      });
    } catch (error) {
      this.logger.error(`Failed to create consumer for queue ${this.queueName}:`, error);
      Sentry.captureException(error, { tags: { queueName: this.queueName, action: 'onEvent' } });
      throw error;
    }
  }

  async publish(event: unknown): Promise<{ success: boolean; message: string } | Infer<R>> {
    try {
      const eventData = this.eventSchema(event as never);
      if (eventData instanceof type.errors) {
        throw new Error(`Invalid event data: ${eventData.summary}`);
      }

      const res = await this.rpcClient.send(this.queueName, eventData);
      const response = this.resultSchema(res.body as never);
      if (!(response instanceof type.errors)) {
        return response;
      }

      throw new Error(`Invalid response schema: ${response.summary}`);
    } catch (err) {
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
  }

  public publishRepeatable(data: unknown, cronPattern: string) {
    if (!cron.validate(cronPattern)) {
      throw new Error('Invalid cron pattern');
    }

    const eventData = this.eventSchema(data as never);
    if (eventData instanceof type.errors) {
      throw new Error(`Invalid event data: ${eventData.summary}`);
    }

    cron.schedule(cronPattern, async () => {
      try {
        await this.rpcClient.send(this.queueName, eventData);
      } catch (e) {
        Sentry.captureException(e, { tags: { queueName: this.queueName } });
        this.logger.error('Error in cron job:', e);
      }
    });
  }

  public getEvents(): EventsType {
    return {
      events: Array.from(this.events.entries()).map(([requestId, details]) => {
        return {
          requestId: requestId,
          queueName: details.queueName,
          expiration: details.expiration ?? 0,
          timestamp: details.timestamp === undefined ? 0 : details.timestamp * 1000,
          caller: details.caller ?? 'system',
        };
      }),
    };
  }

  public async cancelEvent(requestId: string) {
    const event = this.events.get(requestId);
    if (event) {
      await event.cancel();
      this.events.delete(requestId);
    }
  }
}
