import fs from 'fs';
import { createLogger } from '@runtipi/shared';
import path from 'path';

class FileLogger {
  private winstonLogger = createLogger('cli', path.join(process.cwd(), 'logs'));

  private logsFolder = path.join(process.cwd(), 'logs');

  public flush = () => {
    try {
      if (fs.existsSync(path.join(this.logsFolder, 'app.log'))) {
        const appLog = fs.readFileSync(path.join(this.logsFolder, 'app.log'), 'utf-8');
        fs.appendFileSync(path.join(this.logsFolder, 'app.log.history'), appLog);
        fs.writeFileSync(path.join(this.logsFolder, 'app.log'), '');
      }

      if (fs.existsSync(path.join(this.logsFolder, 'error.log'))) {
        const appErrorLog = fs.readFileSync(path.join(this.logsFolder, 'error.log'), 'utf-8');
        fs.appendFileSync(path.join(this.logsFolder, 'error.log.history'), appErrorLog);
        fs.writeFileSync(path.join(this.logsFolder, 'error.log'), '');
      }
    } catch (error) {
      this.winstonLogger.error('Error flushing logs', error);
    }
  };

  public error = (...message: unknown[]) => {
    this.winstonLogger.error(message.join(' '));
  };

  public info = (...message: unknown[]) => {
    this.winstonLogger.info(message.join(' '));
  };

  public warn = (...message: unknown[]) => {
    this.winstonLogger.warn(message.join(' '));
  };

  public debug = (...message: unknown[]) => {
    this.winstonLogger.debug(message.join(' '));
  };
}

export const fileLogger = new FileLogger();
