import { LoggerService } from '@/core/logger/logger.service';
import type { Connection, Publisher } from 'rabbitmq-client';

export class EventPublisher {
  private publisher: Publisher;

  constructor(
    private rabbit: Connection,
    private logger: LoggerService,
    private eventExchange: string,
  ) {}

  public initialize() {
    try {
      this.publisher = this.rabbit.createPublisher({
        confirm: true,
        maxAttempts: 3,
        exchanges: [
          {
            exchange: this.eventExchange,
            type: 'topic',
            durable: true,
          },
        ],
      });
      this.logger.info(`EventPublisher: Exchange '${this.eventExchange}' asserted.`);
    } catch (error) {
      this.logger.error('Failed to initialize EventPublisher channel or assert exchange:', error);
      throw error;
    }
  }

  public async publish(routingKey: string, eventData: object): Promise<void> {
    if (!this.publisher) {
      throw new Error('EventPublisher not initialized. Call initialize() first.');
    }
    try {
      this.publisher.send(
        {
          exchange: this.eventExchange,
          routingKey,
          durable: true,
        },
        eventData,
      );
    } catch (error) {
      this.logger.error(`Error publishing event to ${routingKey}:`, error);
    }
  }

  public async close(): Promise<void> {
    if (this.publisher) {
      await this.publisher.close();
      this.logger.info('EventPublisher channel closed.');
    }
  }
}
