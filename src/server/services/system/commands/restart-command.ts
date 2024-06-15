import { ICommand } from './types';
import { EventDispatcher } from '@/server/core/EventDispatcher';
import { Logger } from '@/server/core/Logger';

export class restartCommand implements ICommand {
  constructor(private eventDispatcher: EventDispatcher) {}

  async execute(): Promise<void> {
    void this.eventDispatcher.dispatchEventAsync({ type: 'system', command: 'restart' }).then(({ success, stdout }) => {
      if (success) {
        Logger.info('Restarting...');
      } else {
        Logger.error(`Failed to restart! Error: ${stdout}`);
      }
    });
  }
}
