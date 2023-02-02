/* eslint-disable vars-on-top */
import fs from 'fs-extra';
import { Logger } from '../Logger';
import { getConfig } from '../TipiConfig';

declare global {
  // eslint-disable-next-line no-var
  var EventDispatcher: EventDispatcher | undefined;
}

export const EVENT_TYPES = {
  // System events
  RESTART: 'restart',
  UPDATE: 'update',
  CLONE_REPO: 'clone_repo',
  UPDATE_REPO: 'update_repo',
  APP: 'app',
  SYSTEM_INFO: 'system_info',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

type SystemEvent = {
  id: string;
  type: EventType;
  args: string[];
  creationDate: Date;
};

type EventStatusTypes = 'running' | 'success' | 'error' | 'waiting';

const WATCH_FILE = '/runtipi/state/events';

// File state example:
// restart 1631231231231 running "arg1 arg2"
class EventDispatcher {
  private static instance: EventDispatcher | null;

  private dispatcherId = EventDispatcher.generateId();

  private queue: SystemEvent[] = [];

  private lock: SystemEvent | null = null;

  private interval: NodeJS.Timer;

  private intervals: NodeJS.Timer[] = [];

  constructor() {
    const timer = this.pollQueue();
    this.interval = timer;
  }

  public static getInstance(): EventDispatcher {
    if (!EventDispatcher.instance) {
      EventDispatcher.instance = new EventDispatcher();
    }
    return EventDispatcher.instance;
  }

  /**
   * Generate a random task id
   * @returns - Random id
   */
  static generateId() {
    return Math.random().toString(36).substring(2, 9);
  }

  /**
   * Collect lock status and clean queue if event is done
   */
  private collectLockStatusAndClean() {
    if (!this.lock) {
      return;
    }

    const status = this.getEventStatus(this.lock.id);

    if (status === 'running' || status === 'waiting') {
      return;
    }

    this.clearEvent(this.lock, status);
    this.lock = null;
  }

  /**
   * Poll queue and run events
   */
  private pollQueue() {
    Logger.info(`EventDispatcher(${this.dispatcherId}): Polling queue...`);

    if (!this.interval) {
      const id = setInterval(() => {
        this.runEvent();
        this.collectLockStatusAndClean();
      }, 1000);
      this.intervals.push(id);
      return id;
    }

    return this.interval;
  }

  /**
   * Run event from the queue if there is no lock
   */
  private async runEvent() {
    if (this.lock) {
      return;
    }

    const event = this.queue[0];
    if (!event) {
      return;
    }

    this.lock = event;

    // Write event to state file
    const args = event.args.join(' ');
    const line = `${event.type} ${event.id} waiting ${args}`;
    fs.writeFileSync(WATCH_FILE, `${line}`);
  }

  /**
   * Check event status
   * @param id - Event id
   * @returns - Event status
   */
  private getEventStatus(id: string): EventStatusTypes {
    const event = this.queue.find((e) => e.id === id);

    if (!event) {
      return 'success';
    }

    // if event was created more than 3 minutes ago, it's an error
    if (new Date().getTime() - event.creationDate.getTime() > 5 * 60 * 1000) {
      return 'error';
    }

    const file = fs.readFileSync(WATCH_FILE, 'utf8');
    const lines = file?.split('\n') || [];
    const line = lines.find((l) => l.startsWith(`${event.type} ${event.id}`));

    if (!line) {
      return 'waiting';
    }

    const status = line.split(' ')[2] as EventStatusTypes;

    return status;
  }

  /**
   * Dispatch an event to the queue
   * @param type - Event type
   * @param args - Event arguments
   * @returns - Event object
   */
  public dispatchEvent(type: EventType, args?: string[]): SystemEvent {
    const event: SystemEvent = {
      id: EventDispatcher.generateId(),
      type,
      args: args || [],
      creationDate: new Date(),
    };

    this.queue.push(event);

    return event;
  }

  /**
   * Clear event from queue
   * @param id - Event id
   */
  private clearEvent(event: SystemEvent, status: EventStatusTypes = 'success') {
    this.queue = this.queue.filter((e) => e.id !== event.id);
    if (fs.existsSync(`/app/logs/${event.id}.log`)) {
      const log = fs.readFileSync(`/app/logs/${event.id}.log`, 'utf8');
      if (log && status === 'error') {
        Logger.error(`EventDispatcher: ${event.type} ${event.id} failed with error: ${log}`);
      } else if (log) {
        Logger.info(`EventDispatcher: ${event.type} ${event.id} finished with message: ${log}`);
      }
      fs.unlinkSync(`/app/logs/${event.id}.log`);
    }
    fs.writeFileSync(WATCH_FILE, '');
  }

  /**
   * Dispatch an event to the queue and wait for it to finish
   * @param type - Event type
   * @param args - Event arguments
   * @returns - Promise that resolves when the event is done
   */
  public async dispatchEventAsync(type: EventType, args?: string[]): Promise<{ success: boolean; stdout?: string }> {
    const event = this.dispatchEvent(type, args);

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        this.intervals.push(interval);
        const status = this.getEventStatus(event.id);

        let log = '';
        if (fs.existsSync(`/app/logs/${event.id}.log`)) {
          log = fs.readFileSync(`/app/logs/${event.id}.log`, 'utf8');
        }

        if (status === 'success') {
          clearInterval(interval);
          resolve({ success: true, stdout: log });
        } else if (status === 'error') {
          clearInterval(interval);
          resolve({ success: false, stdout: log });
        }
      }, 100);
    });
  }

  public clearInterval() {
    clearInterval(this.interval);
    this.intervals.forEach((i) => clearInterval(i));
  }

  public clear() {
    this.queue = [];
    this.lock = null;
    EventDispatcher.instance = null;
    fs.writeFileSync(WATCH_FILE, '');
  }
}

export const EventDispatcherInstance = global.EventDispatcher || EventDispatcher.getInstance();

if (getConfig().NODE_ENV !== 'production') {
  global.EventDispatcher = EventDispatcherInstance;
}
