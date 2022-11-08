import fs from 'fs-extra';
import { eventDispatcher, EventTypes } from '../EventDispatcher';

const WATCH_FILE = '/runtipi/state/events';

jest.mock('fs-extra');

// eslint-disable-next-line no-promise-executor-return
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  eventDispatcher.clear();
  fs.writeFileSync(WATCH_FILE, '');
  fs.writeFileSync('/app/logs/123.log', 'test');
});

describe('EventDispatcher - dispatchEvent', () => {
  it('should dispatch an event', () => {
    const event = eventDispatcher.dispatchEvent(EventTypes.APP);
    expect(event.id).toBeDefined();
  });

  it('should dispatch an event with args', () => {
    const event = eventDispatcher.dispatchEvent(EventTypes.APP, ['--help']);
    expect(event.id).toBeDefined();
  });

  it('Should put events into queue', async () => {
    eventDispatcher.dispatchEvent(EventTypes.APP, ['--help']);
    eventDispatcher.dispatchEvent(EventTypes.APP, ['--help']);

    // @ts-ignore
    const { queue } = eventDispatcher;

    expect(queue.length).toBe(2);
  });

  it('Should put first event into lock after 1 sec', async () => {
    eventDispatcher.dispatchEvent(EventTypes.APP, ['--help']);
    eventDispatcher.dispatchEvent(EventTypes.UPDATE, ['--help']);

    // @ts-ignore
    const { queue } = eventDispatcher;

    await wait(1050);

    // @ts-ignore
    const { lock } = eventDispatcher;

    expect(queue.length).toBe(2);
    expect(lock).toBeDefined();
    expect(lock?.type).toBe(EventTypes.APP);
  });

  it('Should clear event once its status is success', async () => {
    // @ts-ignore
    jest.spyOn(eventDispatcher, 'getEventStatus').mockReturnValueOnce('success');
    eventDispatcher.dispatchEvent(EventTypes.APP, ['--help']);

    await wait(1050);

    // @ts-ignore
    const { queue } = eventDispatcher;

    expect(queue.length).toBe(0);
  });

  it('Should clear event once its status is error', async () => {
    // @ts-ignore
    jest.spyOn(eventDispatcher, 'getEventStatus').mockReturnValueOnce('error');
    eventDispatcher.dispatchEvent(EventTypes.APP, ['--help']);

    await wait(1050);

    // @ts-ignore
    const { queue } = eventDispatcher;

    expect(queue.length).toBe(0);
  });
});

describe('EventDispatcher - dispatchEventAsync', () => {
  it('Should dispatch an event and wait for it to finish', async () => {
    // @ts-ignore
    jest.spyOn(eventDispatcher, 'getEventStatus').mockReturnValueOnce('success');
    const { success } = await eventDispatcher.dispatchEventAsync(EventTypes.APP, ['--help']);

    expect(success).toBe(true);
  });

  it('Should dispatch an event and wait for it to finish with error', async () => {
    // @ts-ignore
    jest.spyOn(eventDispatcher, 'getEventStatus').mockReturnValueOnce('error');

    const { success } = await eventDispatcher.dispatchEventAsync(EventTypes.APP, ['--help']);

    expect(success).toBe(false);
  });
});

describe('EventDispatcher - runEvent', () => {
  it('Should do nothing if there is a lock', async () => {
    // @ts-ignore
    eventDispatcher.lock = { id: '123', type: EventTypes.APP, args: [] };

    // @ts-ignore
    await eventDispatcher.runEvent();

    // @ts-ignore
    const file = fs.readFileSync(WATCH_FILE, 'utf8');

    expect(file).toBe('');
  });

  it('Should do nothing if there is no event in queue', async () => {
    // @ts-ignore
    await eventDispatcher.runEvent();

    // @ts-ignore
    const file = fs.readFileSync(WATCH_FILE, 'utf8');

    expect(file).toBe('');
  });
});

describe('EventDispatcher - getEventStatus', () => {
  it('Should return success if event is not in the queue', async () => {
    // @ts-ignore
    eventDispatcher.queue = [];
    // @ts-ignore
    const status = eventDispatcher.getEventStatus('123');

    expect(status).toBe('success');
  });

  it('Should return error if event is expired', async () => {
    const dateFiveMinutesAgo = new Date(new Date().getTime() - 5 * 60 * 10000);
    // @ts-ignore
    eventDispatcher.queue = [{ id: '123', type: EventTypes.APP, args: [], creationDate: dateFiveMinutesAgo }];
    // @ts-ignore
    const status = eventDispatcher.getEventStatus('123');

    expect(status).toBe('error');
  });

  it('Should be waiting if line is not found in the file', async () => {
    // @ts-ignore
    eventDispatcher.queue = [{ id: '123', type: EventTypes.APP, args: [], creationDate: new Date() }];
    // @ts-ignore
    const status = eventDispatcher.getEventStatus('123');

    expect(status).toBe('waiting');
  });
});

describe('EventDispatcher - clearEvent', () => {
  it('Should clear event', async () => {
    const event = { id: '123', type: EventTypes.APP, args: [], creationDate: new Date() };
    // @ts-ignore
    eventDispatcher.queue = [event];
    // @ts-ignore
    eventDispatcher.clearEvent(event);

    // @ts-ignore
    const { queue } = eventDispatcher;

    expect(queue.length).toBe(0);
  });
});

describe('EventDispatcher - pollQueue', () => {
  it('Should not create a new interval if one already exists', async () => {
    // @ts-ignore
    eventDispatcher.interval = 123;
    // @ts-ignore
    const id = eventDispatcher.pollQueue();
    // @ts-ignore
    const { interval } = eventDispatcher;

    expect(interval).toBe(123);
    expect(id).toBe(123);

    clearInterval(interval);
    clearInterval(id);
  });
});

describe('EventDispatcher - collectLockStatusAndClean', () => {
  it('Should do nothing if there is no lock', async () => {
    // @ts-ignore
    eventDispatcher.lock = null;
    // @ts-ignore
    eventDispatcher.collectLockStatusAndClean();

    // @ts-ignore
    const { lock } = eventDispatcher;

    expect(lock).toBeNull();
  });
});
