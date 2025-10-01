import fs from 'node:fs';
import path from 'node:path';
import * as readline from 'node:readline';
import { Injectable } from '@nestjs/common';
import { type Logger, createLogger, format, transports } from 'winston';

export const LOG_LEVEL_ENUM = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
} as const;
export type LogLevel = (typeof LOG_LEVEL_ENUM)[keyof typeof LOG_LEVEL_ENUM];

const { printf, timestamp, combine, colorize, align } = format;

const printFile = printf((info) => `${info.timestamp} - ${info.level} > ${info.message}`);
const printConsole = printf((info) => `${info.level} > ${info.message}`);

const fileFormat = combine(format.uncolorize(), timestamp(), align(), printFile);
const consoleFormat = combine(colorize(), printConsole);

type Transports = transports.ConsoleTransportInstance | transports.FileTransportInstance;

/**
 * Given an id and a logs folder, creates a new winston logger
 *
 * @param {string} id - The id of the logger, used to identify the logger in the logs
 * @param {string} logsFolder - The folder where the logs will be stored
 */
export const newLogger = (id: string, logsFolder: string, logLevel: LogLevel = LOG_LEVEL_ENUM.info) => {
  const tr: Transports[] = [];
  const exceptionHandlers: Transports[] = [new transports.Console()];

  try {
    tr.push(
      new transports.File({
        filename: path.join(logsFolder, 'error.log'),
        format: fileFormat,
        level: 'error',
      }),
    );
    tr.push(
      new transports.File({
        filename: path.join(logsFolder, 'app.log'),
        format: fileFormat,
        level: logLevel,
      }),
    );

    tr.push(new transports.Console({ level: logLevel, format: consoleFormat }));
  } catch (error) {
    // no-op
  }

  return createLogger({
    level: logLevel,
    transports: tr,
    exceptionHandlers,
    exitOnError: false,
  });
};

@Injectable()
export class LoggerService {
  private winstonLogger: Logger;

  private logsFolder: string;

  private static readonly MAX_HISTORY_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

  constructor(id: string, folder: string, logLevel: LogLevel) {
    this.winstonLogger = newLogger(id, folder, logLevel);
    this.logsFolder = folder;
  }

  private async streamLogToHistory(logFile: string) {
    const maxLines = 10_000;
    const logFilePath = path.join(this.logsFolder, logFile);
    const historyFilePath = path.join(this.logsFolder, `${logFile}.history`);
    const tempHistoryPath = `${historyFilePath}.tmp`;

    return new Promise<void>((resolve, reject) => {
      try {
        if (!fs.existsSync(logFilePath)) {
          resolve();
          return;
        }

        // Read new log entries first
        const logReadStream = fs.createReadStream(logFilePath, 'utf-8');
        const logLineReader = readline.createInterface({ input: logReadStream });

        const newLines: string[] = [];
        logLineReader.on('line', (line) => {
          if (line.trim()) { // Skip empty lines
            newLines.push(line);
          }
        });

        logLineReader.on('close', async () => {
          try {
            let existingLines: string[] = [];

            // Read existing history if it exists
            if (fs.existsSync(historyFilePath)) {
              const historyContent = await fs.promises.readFile(historyFilePath, 'utf-8');
              existingLines = historyContent.split('\n').filter(line => line.trim());
            }

            // Combine lines
            let allLines = [...existingLines, ...newLines];

            // Apply line limit
            if (allLines.length > maxLines) {
              allLines = allLines.slice(allLines.length - maxLines);
            }

            // Apply size limit - remove oldest lines until under cap
            let totalSize = allLines.reduce((sum, line) => sum + Buffer.byteLength(line, 'utf-8') + 1, 0);

            while (totalSize > LoggerService.MAX_HISTORY_SIZE_BYTES && allLines.length > 0) {
              const removedLine = allLines.shift();
              if (removedLine) {
                totalSize -= Buffer.byteLength(removedLine, 'utf-8') + 1;
              }
            }

            // Write to history file
            await fs.promises.writeFile(historyFilePath, allLines.join('\n') + '\n', 'utf-8');

            // Clear log file
            await fs.promises.writeFile(logFilePath, '', 'utf-8');

            resolve();
          } catch (error) {
            reject(error);
          }
        });

        logLineReader.on('error', reject);
        logReadStream.on('error', reject);
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
      // Note: This log message will be written to the cleared log file
      // This is expected behavior - we want to log that flush completed
      this.winstonLogger.info('Logs flushed');
    } catch (error) {
      this.winstonLogger.error('Error flushing logs', error);
    }
  };

  private log = (level: string, messages: unknown[]) => {
    const stringMessages = messages.flatMap((m) => {
      if (m instanceof Error) {
        return [m.message, m.stack];
      }

      if (typeof m === 'object') {
        return JSON.stringify(m, null, 2);
      }

      return m;
    });

    this.winstonLogger.log(level, stringMessages.join(' '));
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
