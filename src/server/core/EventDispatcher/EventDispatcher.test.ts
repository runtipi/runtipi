import fs from 'fs-extra';
import { EventDispatcher } from '.';

const WATCH_FILE = '/runtipi/state/events';

jest.mock('fs-extra');

beforeEach(async () => {
  await fs.promises.mkdir('/runtipi/state', { recursive: true });
  await fs.promises.mkdir('/app/logs', { recursive: true });
  await fs.promises.writeFile(WATCH_FILE, '');
  await fs.promises.writeFile('/app/logs/123.log', 'test');

  EventDispatcher.clear();
});

describe('EventDispatcher - dispatchEvent', () => {
  it('should dispatch an event in the queue', () => {});
});

describe('EventDispatcher - dispatchEventAsync', () => {
  it('Should dispatch an event and wait for it to finish', async () => {});

  it('Should dispatch an event and wait for it to finish with error', async () => {});
});
