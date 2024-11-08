import type { ILogger } from './Logger.interface';

export class LoggerMock implements ILogger {
  public error = () => {
    // no-op
  };
  public info = () => {
    // no-op
  };
  public warn = () => {
    // no-op
  };
  public debug = () => {
    // no-op
  };
  public flush = async () => {
    // no-op
  };
}
