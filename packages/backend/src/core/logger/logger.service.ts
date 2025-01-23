import fs from 'node:fs';
import path from 'node:path';
import * as readline from 'node:readline';
import { Injectable } from '@nestjs/common';
import winston, { createLogger, format, transports } from 'winston';

const { printf, timestamp, combine, colorize, align, label } = format;

type Transports = transports.ConsoleTransportInstance | transports.FileTransportInstance;

/**
 * Given an id and a logs folder, creates a new winston logger
 *
 * @param {string} id - The id of the logger, used to identify the logger in the logs
 * @param {string} logsFolder - The folder where the logs will be stored
 */
export const newLogger = (id: string, logsFolder: string, logLevel = 'info') => {
  const tr: Transports[] = [];
  const exceptionHandlers: Transports[] = [new transports.Console()];

  try {
    tr.push(
      new transports.File({
        filename: path.join(logsFolder, 'error.log'),
        level: 'error',
      }),
    );
    tr.push(
      new transports.File({
        filename: path.join(logsFolder, 'app.log'),
        level: logLevel,
      }),
    );

    tr.push(new transports.Console({ level: logLevel }));
  } catch (error) {
    // no-op
  }

  return createLogger({
    level: logLevel,
    format: combine(
      label({ label: id }),
      colorize(),
      timestamp(),
      align(),
      printf((info) => `${id}: ${info.timestamp} - ${info.level} > ${info.message}`),
    ),
    transports: tr,
    exceptionHandlers,
    exitOnError: false,
  });
};

@Injectable()
export class LoggerService {
  private winstonLogger: winston.Logger;

  private logsFolder: string;

  constructor(id: string, folder: string) {
    this.winstonLogger = newLogger(id, folder, process.env.LOG_LEVEL);
    this.logsFolder = folder;
  }

  private streamLogToHistory(logFile: string) {
    const maxLines = 10_000;
    const logFilePath = path.join(this.logsFolder, logFile);
    const historyFilePath = path.join(this.logsFolder, `${logFile}.history`);
    const tempHistoryPath = `${historyFilePath}.tmp`;

    return new Promise<void>((resolve, reject) => {
      try {
        const tempHistoryWriteStream = fs.createWriteStream(tempHistoryPath);

        if (fs.existsSync(historyFilePath)) {
          const historyReadStream = fs.createReadStream(historyFilePath, 'utf-8');
          const historyLineReader = readline.createInterface({ input: historyReadStream });

          const lineBuffer: string[] = [];
          historyLineReader.on('line', (line) => {
            lineBuffer.push(line);
            if (lineBuffer.length > maxLines) {
              lineBuffer.shift();
            }
          });

          historyLineReader.on('close', () => {
            // Write the last `maxLines` lines to the temp file
            for (const line of lineBuffer) {
              tempHistoryWriteStream.write(`${line}\n`);
            }
            appendLogFile();
          });

          historyReadStream.on('error', reject);
        } else {
          appendLogFile();
        }

        function appendLogFile() {
          const logReadStream = fs.createReadStream(logFilePath, 'utf-8');
          logReadStream.pipe(tempHistoryWriteStream, { end: false });

          logReadStream.on('end', async () => {
            tempHistoryWriteStream.end();

            await fs.promises.rename(tempHistoryPath, historyFilePath);

            await fs.promises.writeFile(logFilePath, '', 'utf-8');
            resolve();
          });

          logReadStream.on('error', reject);
        }

        tempHistoryWriteStream.on('error', reject);
      } catch (error) {
        reject(error);
      }
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
