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
type InferIn<T extends { infer: unknown; inferIn?: unknown }> = T extends { inferIn: infer I } ? I : T['infer'];

export class Queue<T extends ArkTypeSchema, R extends ArkTypeSchema<{ success: boolean; message: string }>> {
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

          try {
            await callback(req.body, reply);
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
