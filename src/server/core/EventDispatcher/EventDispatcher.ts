/* eslint-disable vars-on-top */
import cron from 'node-cron';
import fs from 'fs-extra';
import { Logger } from '../Logger';

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

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

type SystemEvent = {
  id: string;
  type: EventType;
  args: string[];
  creationDate: Date;
};

const EVENT_STATUS = {
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
  WAITING: 'waiting',
} as const;

type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

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
   *
   * @returns {string} id - Randomly generated id
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
   *
   * @returns {NodeJS.Timer} - Interval timer
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
   *
   * @param {string} id - Event id
   * @returns {EventStatus} - Event status
   */
  private getEventStatus(id: string): EventStatus {
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

    const status = line.split(' ')[2] as EventStatus;

    return status;
  }

  /**
   * Dispatch an event to the queue
   *
   * @param {EventType} type - Event type
   * @param {[string]} args - Event arguments
   * @returns {SystemEvent} event - Event object
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
   * Clears an event from the queue
   *
   * @param {SystemEvent} event - The event to clear
   * @param {EventStatus} status - The status to consider the event to
   */
  private clearEvent(event: SystemEvent, status: EventStatus = 'success') {
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
   *
   * @param {EventType} type - Event type
   * @param {[string[]]} args - Event arguments
   * @returns {Promise<{ success: boolean; stdout?: string }>} - Promise that resolves when the event is done
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

  public scheduleEvent(params: { type: EventType; args?: string[]; cronExpression: string }) {
    const { type, args, cronExpression } = params;

    cron.schedule(cronExpression, async () => {
      this.dispatchEvent(type, args);
    });
  }
}

export const EventDispatcherInstance = global.EventDispatcher || EventDispatcher.getInstance();

global.EventDispatcher = EventDispatcherInstance;
