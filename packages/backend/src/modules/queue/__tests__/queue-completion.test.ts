import { LoggerService } from '@/core/logger/logger.service';
import { SSEService } from '@/core/sse/sse.service';
import { AppJobService } from '@/modules/app-lifecycle/services/app-job.service';
import { AppOperationsService } from '@/modules/app-lifecycle/services/app-operations.service';
import { castAppUrn } from '@/common/helpers/app-helpers';
import { fromPartial } from '@total-typescript/shoehorn';
import { AMQPError, type Connection, type RPCClient } from 'rabbitmq-client';
import { expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { appEventSchema, appEventResultSchema, type AppEvent } from '../entities/app-events';
import { EventPublisher } from '../event.publisher';
import { Queue } from '../queue.entity';

type Consumer = Parameters<Connection['createConsumer']>[1];
const urn = castAppUrn('demo:store');
const event = (): AppEvent => ({ appUrn: urn, command: 'stop', requestId: crypto.randomUUID(), form: {} });
const setup = (tracked = true) => {
  const rabbit = mock<Connection>();
  const rpc = mock<RPCClient>();
  const logger = mock<LoggerService>();
  const queue = new Queue(rabbit, rpc, mock<EventPublisher>(), 'app-events-queue', 3, appEventSchema, appEventResultSchema, logger, tracked);
  const operations = new AppOperationsService(new AppJobService(logger, mock<SSEService>()), logger);
  let consumer!: Consumer;
  rabbit.createConsumer.mockImplementation((_options, callback) => {
    consumer = callback;
    return mock();
  });
  const deliver = (message: AppEvent, reply = vi.fn().mockResolvedValue(undefined)) => consumer(fromPartial({ body: message }), reply);

  return { queue, rpc, logger, operations, deliver };
};

test.each(['RPC_TIMEOUT', 'RPC_CLOSED'])('keeps admission through %s until the consumer and post-processing finish', async (code) => {
  const { queue, rpc, operations, deliver } = setup();
  const message = event();
  let finish!: () => void;
  const work = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let finishPostProcessing!: () => void;
  const postProcessing = new Promise<void>((resolve) => {
    finishPostProcessing = resolve;
  });
  queue.onEvent(async (_data, reply) => {
    await work;
    await reply({ success: true, message: 'Worker finished' });
  });
  let failDispatch!: (error: Error) => void;
  rpc.send.mockReturnValue(
    new Promise((_resolve, reject) => {
      failDispatch = reject;
    }),
  );

  const request = await operations.admit(urn, async () =>
    operations.submit(urn, 'stop', message.requestId, async () => {
      const result = await queue.publish(message);
      await postProcessing;
      return result;
    }),
  );
  await vi.waitFor(() => expect(rpc.send).toHaveBeenCalled());
  const consumer = deliver(message, vi.fn().mockRejectedValue(new Error('Reply channel closed')));
  failDispatch(Object.assign(new AMQPError(), { code, message: 'Transport failed' }));
  expect(operations.get(urn, request.requestId)).toMatchObject({ status: 'running' });
  await expect(operations.admit(urn, async () => undefined)).rejects.toThrow('active lifecycle operation');
  await expect(operations.admit(urn, async () => undefined)).rejects.toThrow('active lifecycle operation');

  finish();
  await consumer;
  await expect(operations.admit(urn, async () => undefined)).rejects.toThrow('active lifecycle operation');
  finishPostProcessing();
  await expect(operations.waitFor(request.requestId)).resolves.toEqual({ success: true, message: 'Worker finished' });
  await expect(operations.admit(urn, async () => undefined)).resolves.toBeUndefined();
});

test('executes duplicate deliveries only once and preserves the original result after a lost reply', async () => {
  const { queue, rpc, deliver } = setup();
  const message = event();
  let finish!: () => void;
  const work = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const execute = vi.fn(async (_data, reply) => {
    await work;
    await reply({ success: false, message: 'Command failed' });
  });
  queue.onEvent(execute);
  rpc.send.mockRejectedValue(Object.assign(new AMQPError(), { code: 'RPC_TIMEOUT', message: 'Transport failed' }));

  const published = queue.publish(message);
  const duplicatePublish = queue.publish(message);
  const first = deliver(message);
  const duplicate = deliver(message);
  expect(execute).toHaveBeenCalledTimes(1);
  finish();
  await Promise.all([first, duplicate]);
  await expect(published).resolves.toEqual({ success: false, message: 'Command failed' });
  await expect(duplicatePublish).resolves.toEqual({ success: false, message: 'Command failed' });
  await deliver(message);
  expect(execute).toHaveBeenCalledTimes(1);
  expect(rpc.send).toHaveBeenCalledTimes(1);
});

test('invalid submissions fail before dispatch and ordinary queues still return RPC errors', async () => {
  const tracked = setup();
  await expect(tracked.queue.publish({ command: 'invalid' })).resolves.toMatchObject({ success: false });
  expect(tracked.rpc.send).not.toHaveBeenCalled();

  const ordinary = setup(false);
  ordinary.rpc.send.mockRejectedValue(Object.assign(new AMQPError(), { code: 'RPC_TIMEOUT', message: 'Timed out' }));
  await expect(ordinary.queue.publish(event())).resolves.toEqual({ success: false, message: 'Timed out' });
});

test.each(['RPC_TIMEOUT', 'RPC_CLOSED'])('fences unstarted %s requests, permits retries, and rejects late delivery', async (code) => {
  const { queue, rpc, operations, deliver } = setup();
  const execute = vi.fn(async (_data, reply) => reply({ success: true, message: 'Done' }));
  queue.onEvent(execute);
  rpc.send.mockRejectedValue(Object.assign(new AMQPError(), { code, message: 'Dispatch failed' }));
  const message = event();
  const request = await operations.admit(urn, async () => operations.submit(urn, 'stop', message.requestId, () => queue.publish(message)));

  await expect(operations.waitFor(request.requestId)).resolves.toMatchObject({ success: false });
  await expect(operations.admit(urn, async () => undefined)).resolves.toBeUndefined();
  await deliver(message);
  expect(execute).not.toHaveBeenCalled();
});

test('rejects an untracked delivery after a backend restart', async () => {
  const { queue, deliver } = setup();
  const execute = vi.fn();
  queue.onEvent(execute);
  const reply = vi.fn().mockResolvedValue(undefined);

  await deliver(event(), reply);

  expect(reply).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  expect(execute).not.toHaveBeenCalled();
});
