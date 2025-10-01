import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { beforeEach, describe, expect, it, afterEach } from 'vitest';
import { LoggerService, LOG_LEVEL_ENUM } from '../logger.service';

describe('LoggerService', () => {
  let testLogsFolder: string;
  let loggerService: LoggerService;

  beforeEach(async () => {
    testLogsFolder = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'logger-test-'));
    loggerService = new LoggerService('test-logger', testLogsFolder, LOG_LEVEL_ENUM.info);
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(testLogsFolder, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('flush', () => {
    it('should create history file when flushing logs', async () => {
      const appLogPath = path.join(testLogsFolder, 'app.log');
      const historyPath = path.join(testLogsFolder, 'app.log.history');

      await fs.promises.writeFile(appLogPath, 'Test log entry 1\nTest log entry 2\n', 'utf-8');

      await loggerService.flush();

      expect(fs.existsSync(historyPath)).toBe(true);
      const historyContent = await fs.promises.readFile(historyPath, 'utf-8');
      expect(historyContent).toContain('Test log entry 1');
      expect(historyContent).toContain('Test log entry 2');
    });

    it('should append new logs to existing history', async () => {
      const appLogPath = path.join(testLogsFolder, 'app.log');
      const historyPath = path.join(testLogsFolder, 'app.log.history');

      await fs.promises.writeFile(historyPath, 'Old log entry\n', 'utf-8');
      await fs.promises.writeFile(appLogPath, 'New log entry\n', 'utf-8');

      await loggerService.flush();

      const historyContent = await fs.promises.readFile(historyPath, 'utf-8');
      expect(historyContent).toContain('Old log entry');
      expect(historyContent).toContain('New log entry');
    });

    it('should enforce 10k line limit on history file', async () => {
      const appLogPath = path.join(testLogsFolder, 'app.log');
      const historyPath = path.join(testLogsFolder, 'app.log.history');

      // Create history with 10,000 lines
      const oldLines = Array.from({ length: 10_000 }, (_, i) => `Old line ${i}`);
      await fs.promises.writeFile(historyPath, oldLines.join('\n') + '\n', 'utf-8');

      // Add 100 new lines
      const newLines = Array.from({ length: 100 }, (_, i) => `New line ${i}`);
      await fs.promises.writeFile(appLogPath, newLines.join('\n') + '\n', 'utf-8');

      await loggerService.flush();

      const historyContent = await fs.promises.readFile(historyPath, 'utf-8');
      const lines = historyContent.trim().split('\n');

      // Should keep exactly 10,000 lines
      expect(lines.length).toBe(10_000);

      // Should NOT contain the very oldest lines (they were removed)
      expect(historyContent).toContain('Old line 100');  // First kept line
      expect(historyContent).not.toContain('\nOld line 0\n');  // Use newlines to match exact line
      expect(historyContent).not.toContain('\nOld line 99\n');  // Use newlines to match exact line

      // Should contain the newest lines
      expect(historyContent).toContain('New line 0');
      expect(historyContent).toContain('New line 99');
    });

    it('should enforce 5MB size cap on history file', async () => {
      const appLogPath = path.join(testLogsFolder, 'app.log');
      const historyPath = path.join(testLogsFolder, 'app.log.history');

      // Create a history file larger than 5MB (each line ~1KB, 6000 lines = ~6MB)
      const largeLine = 'x'.repeat(1000);
      const lines = Array.from({ length: 6000 }, (_, i) => `${largeLine} line${i}`);
      await fs.promises.writeFile(historyPath, lines.join('\n') + '\n', 'utf-8');

      const initialStats = await fs.promises.stat(historyPath);
      expect(initialStats.size).toBeGreaterThan(5 * 1024 * 1024);

      // Add new logs of similar size to existing ones
      const newLines = Array.from({ length: 10 }, (_, i) => `${largeLine} newline${i}`);
      await fs.promises.writeFile(appLogPath, newLines.join('\n') + '\n', 'utf-8');

      await loggerService.flush();

      const finalStats = await fs.promises.stat(historyPath);

      // Should be truncated to under 5MB
      expect(finalStats.size).toBeLessThanOrEqual(5 * 1024 * 1024);

      // Should contain the new entries (since they're same size as kept entries)
      const historyContent = await fs.promises.readFile(historyPath, 'utf-8');
      const hasNewEntry = historyContent.includes('newline9'); // Check for last new entry
      expect(hasNewEntry).toBe(true);
    });

    it('should not truncate history file when under 5MB', async () => {
      const appLogPath = path.join(testLogsFolder, 'app.log');
      const historyPath = path.join(testLogsFolder, 'app.log.history');

      // Create a small history file
      const lines = Array.from({ length: 100 }, (_, i) => `Log line ${i}`);
      await fs.promises.writeFile(historyPath, lines.join('\n') + '\n', 'utf-8');

      const initialStats = await fs.promises.stat(historyPath);
      expect(initialStats.size).toBeLessThan(5 * 1024 * 1024);

      await fs.promises.writeFile(appLogPath, 'New log entry\n', 'utf-8');

      await loggerService.flush();

      const finalContent = await fs.promises.readFile(historyPath, 'utf-8');

      // Should contain all old lines plus new one
      lines.forEach((line) => {
        expect(finalContent).toContain(line);
      });
      expect(finalContent).toContain('New log entry');
    });

    it('should handle error.log history file', async () => {
      const errorLogPath = path.join(testLogsFolder, 'error.log');
      const historyPath = path.join(testLogsFolder, 'error.log.history');

      await fs.promises.writeFile(errorLogPath, 'Error entry\n', 'utf-8');

      await loggerService.flush();

      expect(fs.existsSync(historyPath)).toBe(true);
      const historyContent = await fs.promises.readFile(historyPath, 'utf-8');
      expect(historyContent).toContain('Error entry');
    });

    it('should handle missing log files gracefully', async () => {
      await loggerService.flush();
      // Just verify it doesn't throw
      expect(true).toBe(true);
    });

    it('should handle empty log files', async () => {
      const appLogPath = path.join(testLogsFolder, 'app.log');
      await fs.promises.writeFile(appLogPath, '', 'utf-8');

      await loggerService.flush();
      // Just verify it doesn't throw
      expect(true).toBe(true);
    });

    it('should truncate based on size when it exceeds 5MB', async () => {
      const appLogPath = path.join(testLogsFolder, 'app.log');
      const historyPath = path.join(testLogsFolder, 'app.log.history');

      // Create ~6MB with 3000 lines
      const largeLine = 'y'.repeat(2000);
      const lines = Array.from({ length: 3000 }, (_, i) => `${largeLine} ${i}`);
      await fs.promises.writeFile(historyPath, lines.join('\n') + '\n', 'utf-8');

      const initialStats = await fs.promises.stat(historyPath);
      expect(initialStats.size).toBeGreaterThan(5 * 1024 * 1024);

      // Add new logs of similar size
      const newLines = Array.from({ length: 5 }, (_, i) => `${largeLine} newentry${i}`);
      await fs.promises.writeFile(appLogPath, newLines.join('\n') + '\n', 'utf-8');

      await loggerService.flush();

      const finalStats = await fs.promises.stat(historyPath);
      const finalContent = await fs.promises.readFile(historyPath, 'utf-8');
      const finalLines = finalContent.trim().split('\n');

      // Should be under 5MB
      expect(finalStats.size).toBeLessThanOrEqual(5 * 1024 * 1024);

      // Should have fewer lines than original
      expect(finalLines.length).toBeLessThan(3000);

      // Should contain the new entries (since they're same size as kept ones)
      expect(finalContent).toContain('newentry4'); // Check for last entry
    });
  });

  describe('logging methods', () => {
    it('should log info messages', () => {
      expect(() => loggerService.info('Test info message')).not.toThrow();
    });

    it('should log error messages', () => {
      expect(() => loggerService.error('Test error message')).not.toThrow();
    });

    it('should log warn messages', () => {
      expect(() => loggerService.warn('Test warn message')).not.toThrow();
    });

    it('should log debug messages', () => {
      expect(() => loggerService.debug('Test debug message')).not.toThrow();
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      expect(() => loggerService.error(error)).not.toThrow();
    });

    it('should handle object logging', () => {
      const obj = { key: 'value', nested: { data: 123 } };
      expect(() => loggerService.info(obj)).not.toThrow();
    });
  });
});
