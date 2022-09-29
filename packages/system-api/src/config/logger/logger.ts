import fs from 'fs-extra';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import { getConfig } from '../../core/config/TipiConfig';

const { align, printf, timestamp, combine, colorize } = format;

// Create the logs directory if it does not exist
if (!fs.existsSync(getConfig().logs.LOGS_FOLDER)) {
  fs.mkdirSync(getConfig().logs.LOGS_FOLDER);
}

/**
 * Production logger format
 */
const combinedLogFormat = combine(
  timestamp(),
  printf((info) => `${info.timestamp} > ${info.message}`),
);

/**
 * Development logger format
 */
const combinedLogFormatDev = combine(
  colorize(),
  align(),
  printf((info) => `${info.level}: ${info.message}`),
);

const Logger = createLogger({
  level: 'info',
  format: combinedLogFormat,
  transports: [
    //
    // - Write to all logs with level `info` and below to `app.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new transports.File({
      filename: path.join(getConfig().logs.LOGS_FOLDER, getConfig().logs.LOGS_ERROR),
      level: 'error',
    }),
    new transports.File({
      filename: path.join(getConfig().logs.LOGS_FOLDER, getConfig().logs.LOGS_APP),
    }),
  ],
  exceptionHandlers: [new transports.File({ filename: path.join(getConfig().logs.LOGS_FOLDER, getConfig().logs.LOGS_ERROR) })],
});

//
// If we're not in production then log to the `console
//
const LoggerDev = createLogger({
  level: 'debug',
  format: combinedLogFormatDev,
  transports: [
    new transports.Console({
      level: 'debug',
    }),
  ],
});

export default process.env.NODE_ENV === 'production' ? Logger : LoggerDev;
