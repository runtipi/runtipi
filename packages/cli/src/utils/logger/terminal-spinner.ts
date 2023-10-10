import logUpdate from 'log-update';
import chalk from 'chalk';
import { dots } from 'cli-spinners';

export class TerminalSpinner {
  message: string;

  frame = 0;

  interval: NodeJS.Timeout | null = null;

  start() {
    this.interval = setInterval(() => {
      // eslint-disable-next-line no-plusplus
      this.frame = ++this.frame % dots.frames.length;
      logUpdate(`${dots.frames[this.frame]} ${this.message}`);
    }, dots.interval);
  }

  constructor(message: string) {
    this.message = message;
  }

  setMessage(message: string) {
    this.message = message;
  }

  done(message?: string) {
    if (this.interval) {
      clearInterval(this.interval);
    }

    if (message) {
      logUpdate(chalk.green('✓'), message);
    } else {
      logUpdate.clear();
    }

    logUpdate.done();
  }

  fail(message?: string) {
    if (this.interval) {
      clearInterval(this.interval);
    }

    if (message) {
      logUpdate(chalk.red('✗'), message);
    } else {
      logUpdate.clear();
    }

    logUpdate.done();
  }

  log(message: string) {
    logUpdate(message);

    logUpdate.done();
  }
}
