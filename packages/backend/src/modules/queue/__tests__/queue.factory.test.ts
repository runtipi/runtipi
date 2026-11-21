import { type } from 'arktype';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { ConfigurationService } from '@/core/config/configuration.service';
import type { LoggerService } from '@/core/logger/logger.service';
import { QueueFactory } from '../queue.factory';

const rabbit = vi.hoisted(() => ({
  createConsumer: vi.fn(),
  createPublisher: vi.fn(() => ({ close: vi.fn() })),
  createRPCClient: vi.fn(() => ({ send: vi.fn() })),
  on: vi.fn((event: string, callback: () => void) => {
    if (event === 'connection') {
      callback();
    }
  }),
  ready: true,
}));

vi.mock('rabbitmq-client', () => ({
  Connection: vi.fn(function Connection() {
    return rabbit;
  }),
}));

describe('QueueFactory', () => {
  const configurationService = mock<ConfigurationService>();
  const loggerService = mock<LoggerService>();

  beforeEach(() => {
    vi.clearAllMocks();

    configurationService.get.calledWith('queue').mockReturnValue({
      host: 'localhost',
      password: 'guest',
      username: 'guest',
    });
  });

  it.each([false, true])('declares durable queues and avoids RPC retries when consumer tracking is %s', async (waitForConsumer) => {
    const queueFactory = new QueueFactory(loggerService, configurationService);

    const queue = await queueFactory.createQueue({
      queueName: 'app-events-queue',
      waitForConsumer,
      eventSchema: type({ event: 'string' }),
    });

    expect(rabbit.createRPCClient).toHaveBeenCalledWith(
      expect.objectContaining({
        maxAttempts: waitForConsumer ? 1 : 3,
        queues: [{ autoDelete: false, durable: true, queue: 'app-events-queue' }],
      }),
    );

    queue.onEvent(vi.fn());

    expect(rabbit.createConsumer).toHaveBeenCalledWith(
      expect.objectContaining({
        queue: 'app-events-queue',
        queueOptions: { autoDelete: false, durable: true },
      }),
      expect.any(Function),
    );
  });
});
