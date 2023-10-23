import fs from 'fs';
import { createLogger } from '@runtipi/shared';
import path from 'path';

function streamLogToHistory(logsFolder: string, logFile: string) {
  return new Promise((resolve, reject) => {
    const appLogReadStream = fs.createReadStream(path.join(logsFolder, logFile), 'utf-8');
    const appLogHistoryWriteStream = fs.createWriteStream(path.join(logsFolder, `${logFile}.history`), { flags: 'a' });

    appLogReadStream
      .pipe(appLogHistoryWriteStream)
      .on('finish', () => {
        fs.writeFileSync(path.join(logsFolder, logFile), '');
        resolve(true);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

class FileLogger {
  private winstonLogger = createLogger('cli', path.join(process.cwd(), 'logs'));

  private logsFolder = path.join(process.cwd(), 'logs');

  public flush = async () => {
    try {
      if (fs.existsSync(path.join(this.logsFolder, 'app.log'))) {
        await streamLogToHistory(this.logsFolder, 'app.log');
      }
      if (fs.existsSync(path.join(this.logsFolder, 'error.log'))) {
        await streamLogToHistory(this.logsFolder, 'error.log');
      }
      this.winstonLogger.info('Logs flushed');
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
