import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LoggerService, LOG_LEVEL_ENUM } from '../logger.service';

describe('LoggerService', () => {
  const testLogsFolder = path.join(__dirname, 'test-logs');
  let loggerService: LoggerService;

  beforeEach(async () => {
    // Create test logs directory
    if (!fs.existsSync(testLogsFolder)) {
      await fs.promises.mkdir(testLogsFolder, { recursive: true });
    }
    loggerService = new LoggerService('test', testLogsFolder, LOG_LEVEL_ENUM.info);
  });

  afterEach(async () => {
    // Clean up test logs directory
    if (fs.existsSync(testLogsFolder)) {
      const files = await fs.promises.readdir(testLogsFolder);
      for (const file of files) {
        await fs.promises.unlink(path.join(testLogsFolder, file));
      }
      await fs.promises.rmdir(testLogsFolder);
    }
  });

  describe('clearLogs', () => {
    it('should delete all log files', async () => {
      // Create test log files
      await fs.promises.writeFile(path.join(testLogsFolder, 'app.log'), 'test log content\n');
      await fs.promises.writeFile(path.join(testLogsFolder, 'error.log'), 'test error content\n');
      await fs.promises.writeFile(path.join(testLogsFolder, 'app.log.history'), 'test history content\n');
      await fs.promises.writeFile(path.join(testLogsFolder, 'error.log.history'), 'test error history content\n');

      // Verify files exist
      expect(fs.existsSync(path.join(testLogsFolder, 'app.log'))).toBe(true);
      expect(fs.existsSync(path.join(testLogsFolder, 'error.log'))).toBe(true);
      expect(fs.existsSync(path.join(testLogsFolder, 'app.log.history'))).toBe(true);
      expect(fs.existsSync(path.join(testLogsFolder, 'error.log.history'))).toBe(true);

      // Clear logs
      await loggerService.clearLogs();

      // Verify files are deleted
      expect(fs.existsSync(path.join(testLogsFolder, 'app.log'))).toBe(false);
      expect(fs.existsSync(path.join(testLogsFolder, 'error.log'))).toBe(false);
      expect(fs.existsSync(path.join(testLogsFolder, 'app.log.history'))).toBe(false);
      expect(fs.existsSync(path.join(testLogsFolder, 'error.log.history'))).toBe(false);
    });

    it('should not throw error if log files do not exist', async () => {
      // Ensure no files exist
      const files = ['app.log', 'error.log', 'app.log.history', 'error.log.history'];
      for (const file of files) {
        const filePath = path.join(testLogsFolder, file);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      }

      // Should not throw
      await expect(loggerService.clearLogs()).resolves.not.toThrow();
    });

    it('should delete only existing files', async () => {
      // Create only some files
      await fs.promises.writeFile(path.join(testLogsFolder, 'app.log'), 'test log content\n');
      await fs.promises.writeFile(path.join(testLogsFolder, 'app.log.history'), 'test history content\n');

      // Clear logs
      await loggerService.clearLogs();

      // Verify files are deleted
      expect(fs.existsSync(path.join(testLogsFolder, 'app.log'))).toBe(false);
      expect(fs.existsSync(path.join(testLogsFolder, 'app.log.history'))).toBe(false);
    });
  });
});
