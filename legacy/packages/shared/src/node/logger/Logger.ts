import path from 'node:path';
import { createLogger, format, transports } from 'winston';

const { printf, timestamp, combine, colorize, align, label } = format;

type Transports = transports.ConsoleTransportInstance | transports.FileTransportInstance;

/**
 * Given an id and a logs folder, creates a new winston logger
 *
 * @param {string} id - The id of the logger, used to identify the logger in the logs
 * @param {string} logsFolder - The folder where the logs will be stored
 */
export const newLogger = (id: string, logsFolder: string) => {
  const tr: Transports[] = [];
  let exceptionHandlers: Transports[] = [new transports.Console()];
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
        level: 'info',
      }),
    );
    exceptionHandlers = [new transports.File({ filename: path.join(logsFolder, 'error.log') })];

    tr.push(new transports.Console({ level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info') }));
  } catch (error) {
    // no-op
  }

  return createLogger({
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
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
