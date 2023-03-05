/* eslint-disable vars-on-top */
import cron from 'node-cron';
import fs from 'fs-extra';
import chokidar from 'chokidar';
import { event_status_enum } from '@prisma/client';
import { Logger } from '../Logger';
import { getConfig } from '../TipiConfig';
import { prisma } from '../../db/client';

declare global {
  // eslint-disable-next-line no-var
  var EventDispatcher: EventDispatcherClass | undefined;
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

const WATCH_FOLDER = '/runtipi/state/test-events';

const getInfoFromFile = (path: string) => {
  const file = fs.readFileSync(path, 'utf8');

  const [type, id, status] = file.split(' ');

  return { type, id, status };
};

// File state example:
// restart 1631231231231 running "arg1 arg2"
export class EventDispatcherClass {
  private static instance: EventDispatcherClass | null;

  private intervals: NodeJS.Timer[] = [];

  private watcher = chokidar.watch(WATCH_FOLDER, {});

  private prisma = prisma;

  constructor() {
    this.watcher.on('change', this.onFileChange);
  }

  private async onFileChange(path: string) {
    Logger.info(`File ${path} has been changed`);
    const { type, id, status } = getInfoFromFile(path);

    Logger.info(`Event ${type} ${id} has status ${status}`);

    if (!type || !id || !status) return;

    if (status === 'success' || status === 'error') {
      Logger.info(`Deleting event ${type} ${id} as it has status ${status}`);
      console.log(prisma.event);
      await this.prisma.event.delete({ where: { id: Number(id) } });
    }

    Logger.info(`Updating event ${type} ${id} with status ${status}`);
    await this.prisma.event.update({
      where: { id: Number(id) },
      data: { status: status as event_status_enum },
    });
  }

  public static getInstance() {
    if (!EventDispatcherClass.instance) {
      EventDispatcherClass.instance = new EventDispatcherClass();
    }
    return EventDispatcherClass.instance;
  }

  /**
   * Dispatch an event to the queue
   *
   * @param {EventType} type - Event type
   * @param {[string]} args - Event arguments
   * @returns {event} - The event created
   */
  public async dispatchEvent(type: EventType, args?: string[]) {
    const newEvent = await this.prisma.event.create({
      data: { type, status: 'waiting', message: '', args: args ? args.join(' ') : '' },
    });
    const line = `${newEvent.type} ${newEvent.id} waiting ${args}`;
    fs.writeFileSync(`${WATCH_FOLDER}/${newEvent.id}`, `${line}`);

    return newEvent;
  }

  /**
   * Clears an event from the queue
   *
   * @param {SystemEvent} event - The event to clear
   * @param {EventStatus} status - The status to consider the event to
   */
  // private clearEvent(event: SystemEvent, status: EventStatus = 'success') {
  //   this.queue = this.queue.filter((e) => e.id !== event.id);
  //   if (fs.existsSync(`/app/logs/${event.id}.log`)) {
  //     const log = fs.readFileSync(`/app/logs/${event.id}.log`, 'utf8');
  //     if (log && status === 'error') {
  //       Logger.error(`EventDispatcher: ${event.type} ${event.id} failed with error: ${log}`);
  //     } else if (log) {
  //       Logger.info(`EventDispatcher: ${event.type} ${event.id} finished with message: ${log}`);
  //     }
  //     fs.unlinkSync(`/app/logs/${event.id}.log`);
  //   }
  //   fs.writeFileSync(WATCH_FILE, '');
  // }

  /**
   * Dispatch an event to the queue and wait for it to finish
   *
   * @param {EventType} type - Event type
   * @param {[string[]]} args - Event arguments
   * @returns - Promise that resolves when the event is done
   */
  public async dispatchEventAsync(type: EventType, args?: string[]): Promise<{ success: boolean; stdout?: string }> {
    const event = await this.dispatchEvent(type, args);
    const path = `${WATCH_FOLDER}/${event.id}`;

    return new Promise((resolve) => {
      let { status } = event;

      do {
        status = getInfoFromFile(path).status as event_status_enum;

        let log = '';
        if (fs.existsSync(`/app/logs/${event.id}.log`)) {
          log = fs.readFileSync(`/app/logs/${event.id}.log`, 'utf8');
        }

        if (status === 'success') {
          resolve({ success: true, stdout: log });
        } else if (status === 'error') {
          resolve({ success: false, stdout: log });
        }
      } while (status !== 'success' && status !== 'error');
    });
  }

  public static clear() {
    EventDispatcherClass.instance = null;
    // Detlete all events from watch folder
    fs.readdirSync(WATCH_FOLDER).forEach((file) => {
      fs.unlinkSync(`${WATCH_FOLDER}/${file}`);
    });
  }

  public scheduleEvent(params: { type: EventType; args?: string[]; cronExpression: string }) {
    const { type, args, cronExpression } = params;

    cron.schedule(cronExpression, async () => {
      this.dispatchEvent(type, args);
    });
  }
}

export const EventDispatcherInstance = global.EventDispatcher || EventDispatcherClass.getInstance();

if (getConfig().NODE_ENV !== 'production') {
  global.EventDispatcher = EventDispatcherInstance;
}
