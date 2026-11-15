import { LoggerService } from '@/core/logger/logger.service';
import { SSEService } from '@/core/sse/sse.service';
import { castAppUrn } from '@/common/helpers/app-helpers';
import { AppJobService } from '@/modules/app-lifecycle/services/app-job.service';
import { AppOperationsService } from '@/modules/app-lifecycle/services/app-operations.service';
import { Connection } from 'rabbitmq-client';
import { expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { appEventSchema, appEventResultSchema } from '../../entities/app-events';
import { EventPublisher } from '../../event.publisher';
import { Queue } from '../../queue.entity';

test('a real RPC timeout keeps the app reserved until the worker finishes', async () => {
  const logger = mock<LoggerService>();
  const connection = new Connection({ hostname: 'localhost', username: 'guest', password: 'guest' });
  connection.on('error', (error) => logger.error('Test queue connection error', error));
  const queueName = `mcp-timeout-test-${crypto.randomUUID()}`;
  const rpc = connection.createRPCClient({ timeout: 50, maxAttempts: 1, confirm: true, queues: [{ queue: queueName, durable: true }] });
  const queue = new Queue(connection, rpc, mock<EventPublisher>(), queueName, 3, appEventSchema, appEventResultSchema, logger, true);
  const consumerSpy = vi.spyOn(connection, 'createConsumer');
  let finish!: () => void;
  const work = new Promise<void>((resolve) => {
    finish = resolve;
  });
  queue.onEvent(async (_data, reply) => {
    await work;
    await reply({ success: true, message: 'Worker finished' });
  });
  const consumer = consumerSpy.mock.results[0]!.value;

  try {
    await new Promise<void>((resolve) => consumer.on('ready', resolve));
    const urn = castAppUrn('demo:store');
    const operations = new AppOperationsService(new AppJobService(logger, mock<SSEService>()), logger);
    const requestId = crypto.randomUUID();
    const request = await operations.admit(urn, async () =>
      operations.submit(urn, 'stop', requestId, async () => queue.publish({ appUrn: urn, command: 'stop', requestId, form: {} })),
    );
    await vi.waitFor(() => expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('queue timed out')), { timeout: 5000 });

    expect(operations.get(urn, request.requestId)).toMatchObject({ status: 'running' });
    await expect(operations.admit(urn, async () => undefined)).rejects.toThrow('active lifecycle operation');
    finish();
    await expect(operations.waitFor(requestId)).resolves.toEqual({ success: true, message: 'Worker finished' });
    await expect(operations.admit(urn, async () => undefined)).resolves.toBeUndefined();
  } finally {
    finish();
    await consumer.close();
    await rpc.close();
    const channel = await connection.acquire();
    await channel.queueDelete({ queue: queueName });
    await channel.close();
    await connection.close();
  }
}, 30000);
