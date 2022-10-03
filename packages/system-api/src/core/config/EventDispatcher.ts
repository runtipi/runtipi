import fs from 'fs-extra';
import logger from '../../config/logger/logger';

export enum EventTypes {
  // System events
  RESTART = 'restart',
  UPDATE = 'update',
  CLONE_REPO = 'clone_repo',
  UPDATE_REPO = 'update_repo',
  APP = 'app',
  SYSTEM_INFO = 'system_info',
}

type SystemEvent = {
  id: string;
  type: EventTypes;
  args: string[];
  creationDate: Date;
};

type EventStatusTypes = 'running' | 'success' | 'error' | 'waiting';

const WATCH_FILE = '/runtipi/state/events';

// File state example:
// restart 1631231231231 running "arg1 arg2"
class EventDispatcher {
  private queue: SystemEvent[] = [];

  private lock: SystemEvent | null = null;

  constructor() {
    this.pollQueue();
  }

  /**
   * Generate a random task id
   * @returns - Random id
   */
  private generateId() {
    return Math.random().toString(36).substr(2, 9);
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

    console.log('Status: ', status, 'clearing');
    this.clearEvent(this.lock.id);
    this.lock = null;
  }

  /**
   * Poll queue and run events
   */
  private pollQueue() {
    logger.info('EventDispatcher: Polling queue...');
    setInterval(() => {
      this.runEvent();
      this.collectLockStatusAndClean();
    }, 1000);
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
    console.log('Writing line: ', line);
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
    const lines = file.split('\n') || [];
    const line = lines.find((l) => l.startsWith(`${event.type} ${event.id}`));

    if (!line) {
      return 'waiting';
    }

    const status = line.split(' ')[2] as EventStatusTypes;

    if (status === 'error') {
      console.error(lines);
    }

    return status;
  }

  /**
   * Dispatch an event to the queue
   * @param type - Event type
   * @param args - Event arguments
   * @returns - Event object
   */
  public dispatchEvent(type: EventTypes, args?: string[]): SystemEvent {
    const event: SystemEvent = {
      id: this.generateId(),
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
  private clearEvent(id: string) {
    this.queue = this.queue.filter((e) => e.id !== id);
    if (fs.existsSync(`/app/logs/${id}.log`)) {
      fs.unlinkSync(`/app/logs/${id}.log`);
    }
    fs.writeFileSync(WATCH_FILE, '');
  }

  /**
   * Dispatch an event to the queue and wait for it to finish
   * @param type - Event type
   * @param args - Event arguments
   * @returns - Promise that resolves when the event is done
   */
  public async dispatchEventAsync(type: EventTypes, args?: string[]): Promise<{ success: boolean; stdout?: string }> {
    const event = this.dispatchEvent(type, args);

    return new Promise((resolve) => {
      const interval = setInterval(() => {
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

  public clear() {
    this.queue = [];
    this.lock = null;
    fs.writeFileSync(WATCH_FILE, '');
  }
}

export default new EventDispatcher();
