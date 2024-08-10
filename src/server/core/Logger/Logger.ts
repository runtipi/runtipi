import path from 'path';
import fs from 'fs-extra';
import { createLogger, format, transports } from 'winston';
import { DATA_DIR } from '../../../config/constants';

const { align, printf, timestamp, combine, colorize } = format;

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

const productionLogger = () => {
  const logsFolder = `${DATA_DIR}/logs`;
  try {
    if (!fs.existsSync(logsFolder)) {
      fs.mkdirSync(logsFolder);
    }
    return createLogger({
      level: 'info',
      format: combinedLogFormat,
      transports: [
        //
        // - Write to all logs with level `info` and below to `app.log`
        // - Write all logs error (and below) to `error.log`.
        //
        new transports.File({
          filename: path.join(logsFolder, 'error.log'),
          level: 'error',
        }),
        new transports.File({
          filename: path.join(logsFolder, 'app.log'),
        }),
        new transports.Console({
          level: 'info',
        }),
      ],
      exceptionHandlers: [new transports.File({ filename: path.join(logsFolder, 'error.log') })],
    });
  } catch (e) {
    return createLogger({
      level: 'info',
      format: combinedLogFormat,
      transports: [
        new transports.Console({
          level: 'info',
        }),
      ],
    });
  }
};

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

export default process.env.NODE_ENV === 'production' ? productionLogger() : LoggerDev;
