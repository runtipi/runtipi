import fs from 'fs';
import path from 'path';
import { newLogger as createLogger } from './Logger';
import type { ILogger } from './Logger.interface';

export class Logger implements ILogger {
  private winstonLogger;

  private logsFolder;

  constructor(id: string, folder: string) {
    this.winstonLogger = createLogger(id, folder);
    this.logsFolder = folder;
  }

  streamLogToHistory(logFile: string) {
    return new Promise((resolve, reject) => {
      const appLogReadStream = fs.createReadStream(path.join(this.logsFolder, logFile), 'utf-8');
      const appLogHistoryWriteStream = fs.createWriteStream(path.join(this.logsFolder, `${logFile}.history`), { flags: 'a' });

      appLogReadStream
        .pipe(appLogHistoryWriteStream)
        .on('finish', () => {
          fs.writeFileSync(path.join(this.logsFolder, logFile), '');
          resolve(true);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  public flush = async () => {
    try {
      if (fs.existsSync(path.join(this.logsFolder, 'app.log'))) {
        await this.streamLogToHistory('app.log');
      }
      if (fs.existsSync(path.join(this.logsFolder, 'error.log'))) {
        await this.streamLogToHistory('error.log');
      }
      this.winstonLogger.info('Logs flushed');
    } catch (error) {
      this.winstonLogger.error('Error flushing logs', error);
    }
  };

  private log = (level: string, messages: unknown[]) => {
    if (typeof window !== 'undefined') {
      console.log(level, messages.join(' '));
      return;
    }

    this.winstonLogger.log(level, messages.join(' '));
  };

  public error = (...message: unknown[]) => {
    this.log('error', message);
  };

  public info = (...message: unknown[]) => {
    this.log('info', message);
  };

  public warn = (...message: unknown[]) => {
    this.log('warn', message);
  };

  public debug = (...message: unknown[]) => {
    this.log('debug', message);
  };
}
