/**
 * @jest-environment node
 */
import fs from 'fs-extra';
import { EventDispatcher, EventTypes } from '.';

const WATCH_FILE = '/runtipi/state/events';

jest.mock('fs-extra');

// eslint-disable-next-line no-promise-executor-return
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  EventDispatcher.clear();
  fs.writeFileSync(WATCH_FILE, '');
  fs.writeFileSync('/app/logs/123.log', 'test');
});

describe('EventDispatcher - dispatchEvent', () => {
  it('should dispatch an event', () => {
    const event = EventDispatcher.dispatchEvent(EventTypes.APP);
    expect(event.id).toBeDefined();
  });

  it('should dispatch an event with args', () => {
    const event = EventDispatcher.dispatchEvent(EventTypes.APP, ['--help']);
    expect(event.id).toBeDefined();
  });

  it('Should put events into queue', async () => {
    EventDispatcher.dispatchEvent(EventTypes.APP, ['--help']);
    EventDispatcher.dispatchEvent(EventTypes.APP, ['--help']);

    // @ts-expect-error - private method
    const { queue } = EventDispatcher;

    expect(queue.length).toBe(2);
  });

  it('Should put first event into lock after 1 sec', async () => {
    EventDispatcher.dispatchEvent(EventTypes.APP, ['--help']);
    EventDispatcher.dispatchEvent(EventTypes.UPDATE, ['--help']);

    // @ts-expect-error - private method
    const { queue } = EventDispatcher;

    await wait(1050);

    // @ts-expect-error - private method
    const { lock } = EventDispatcher;

    expect(queue.length).toBe(2);
    expect(lock).toBeDefined();
    expect(lock?.type).toBe(EventTypes.APP);
  });

  it('Should clear event once its status is success', async () => {
    // @ts-expect-error - private method
    jest.spyOn(EventDispatcher, 'getEventStatus').mockReturnValueOnce('success');
    EventDispatcher.dispatchEvent(EventTypes.APP, ['--help']);

    await wait(1050);

    // @ts-expect-error - private method
    const { queue } = EventDispatcher;

    expect(queue.length).toBe(0);
  });

  it('Should clear event once its status is error', async () => {
    // @ts-expect-error - private method
    jest.spyOn(EventDispatcher, 'getEventStatus').mockReturnValueOnce('error');
    EventDispatcher.dispatchEvent(EventTypes.APP, ['--help']);

    await wait(1050);

    // @ts-expect-error - private method
    const { queue } = EventDispatcher;

    expect(queue.length).toBe(0);
  });
});

describe('EventDispatcher - dispatchEventAsync', () => {
  it('Should dispatch an event and wait for it to finish', async () => {
    // @ts-expect-error - private method
    jest.spyOn(EventDispatcher, 'getEventStatus').mockReturnValueOnce('success');
    const { success } = await EventDispatcher.dispatchEventAsync(EventTypes.APP, ['--help']);

    expect(success).toBe(true);
  });

  it('Should dispatch an event and wait for it to finish with error', async () => {
    // @ts-expect-error - private method
    jest.spyOn(EventDispatcher, 'getEventStatus').mockReturnValueOnce('error');

    const { success } = await EventDispatcher.dispatchEventAsync(EventTypes.APP, ['--help']);

    expect(success).toBe(false);
  });
});

describe('EventDispatcher - runEvent', () => {
  it('Should do nothing if there is a lock', async () => {
    // @ts-expect-error - private method
    EventDispatcher.lock = { id: '123', type: EventTypes.APP, args: [] };
    // @ts-expect-error - private method
    await EventDispatcher.runEvent();

    const file = fs.readFileSync(WATCH_FILE, 'utf8');

    expect(file).toBe('');
  });

  it('Should do nothing if there is no event in queue', async () => {
    // @ts-expect-error - private method
    await EventDispatcher.runEvent();

    const file = fs.readFileSync(WATCH_FILE, 'utf8');

    expect(file).toBe('');
  });
});

describe('EventDispatcher - getEventStatus', () => {
  it('Should return success if event is not in the queue', async () => {
    // @ts-expect-error - private method
    EventDispatcher.queue = [];
    // @ts-expect-error - private method
    const status = EventDispatcher.getEventStatus('123');

    expect(status).toBe('success');
  });

  it('Should return error if event is expired', async () => {
    const dateFiveMinutesAgo = new Date(new Date().getTime() - 5 * 60 * 10000);
    // @ts-expect-error - private method
    EventDispatcher.queue = [{ id: '123', type: EventTypes.APP, args: [], creationDate: dateFiveMinutesAgo }];
    // @ts-expect-error - private method
    const status = EventDispatcher.getEventStatus('123');

    expect(status).toBe('error');
  });

  it('Should be waiting if line is not found in the file', async () => {
    // @ts-expect-error - private method
    EventDispatcher.queue = [{ id: '123', type: EventTypes.APP, args: [], creationDate: new Date() }];
    // @ts-expect-error - private method
    const status = EventDispatcher.getEventStatus('123');

    expect(status).toBe('waiting');
  });
});

describe('EventDispatcher - clearEvent', () => {
  it('Should clear event', async () => {
    const event = { id: '123', type: EventTypes.APP, args: [], creationDate: new Date() };
    // @ts-expect-error - private method
    EventDispatcher.queue = [event];
    // @ts-expect-error - private method
    EventDispatcher.clearEvent(event);

    // @ts-expect-error - private method
    const { queue } = EventDispatcher;

    expect(queue.length).toBe(0);
  });
});

describe('EventDispatcher - pollQueue', () => {
  it('Should not create a new interval if one already exists', async () => {
    // @ts-expect-error - private method
    EventDispatcher.interval = 123;
    // @ts-expect-error - private method
    const id = EventDispatcher.pollQueue();
    // @ts-expect-error - private method
    const { interval } = EventDispatcher;

    expect(interval).toBe(123);
    expect(id).toBe(123);

    clearInterval(interval);
    clearInterval(id);
  });
});

describe('EventDispatcher - collectLockStatusAndClean', () => {
  it('Should do nothing if there is no lock', async () => {
    // @ts-expect-error - private method
    EventDispatcher.lock = null;
    // @ts-expect-error - private method
    EventDispatcher.collectLockStatusAndClean();

    // @ts-expect-error - private method
    const { lock } = EventDispatcher;

    expect(lock).toBeNull();
  });
});
