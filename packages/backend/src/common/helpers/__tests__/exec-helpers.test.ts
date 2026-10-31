import { execFileAsync, spawnAsync } from '../exec-helpers';
import { describe, expect, it } from 'vitest';

describe('execFileAsync', () => {
  describe('Array-only execution (security requirement)', () => {
    it('should execute command from array', async () => {
      const result = await execFileAsync('echo', ['test']);
      expect(result.stdout).toContain('test');
      expect(result.stderr).toBe('');
    });

    it('should execute command with multiple arguments', async () => {
      const result = await execFileAsync('echo', ['hello', 'world']);
      expect(result.stdout).toContain('hello');
      expect(result.stdout).toContain('world');
    });

    it('should execute command with quoted arguments', async () => {
      const result = await execFileAsync('echo', ['hello world']);
      expect(result.stdout).toContain('hello world');
    });

    it('should execute command with flags', async () => {
      const result = await execFileAsync('echo', ['-n', 'test']);
      expect(result.stdout).toContain('test');
    });

    it('should handle command that fails with array arguments', async () => {
      const result = await execFileAsync('false', []);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBeTruthy();
    });
  });

  describe('Security - Empty command validation', () => {
    it('should reject empty command', async () => {
      await expect(execFileAsync('', [])).rejects.toThrow('Command cannot be empty');
    });

    it('should accept valid command with no arguments', async () => {
      const result = await execFileAsync('echo', []);
      expect(result.stdout).toBeTruthy();
    });
  });

  describe('Security - Command injection prevention', () => {
    it('should prevent command injection via array arguments', async () => {
      const result = await execFileAsync('echo', ['$(whoami)']);
      expect(result.stdout).toContain('$(whoami)');
    });

    it('should prevent command injection with backticks via array', async () => {
      const result = await execFileAsync('echo', ['`whoami`']);
      expect(result.stdout).toContain('`whoami`');
    });

    it('should prevent command injection with semicolon via array', async () => {
      const result = await execFileAsync('echo', ['test;ls']);
      expect(result.stdout).toContain('test;ls');
    });

    it('should prevent command injection with pipe via array', async () => {
      const result = await execFileAsync('echo', ['test|whoami']);
      expect(result.stdout).toContain('test|whoami');
    });

    it('should prevent command injection with ampersand via array', async () => {
      const result = await execFileAsync('echo', ['test&whoami']);
      expect(result.stdout).toContain('test&whoami');
    });

    it('should prevent command injection with newlines via array', async () => {
      const result = await execFileAsync('echo', ['test\nwhoami']);
      expect(result.stdout).toContain('test\nwhoami');
    });

    it('should prevent command injection with backslashes via array', async () => {
      const result = await execFileAsync('echo', ['test\\nwhoami']);
      expect(result.stdout).toContain('test\\nwhoami');
    });
  });

  describe('Security - Path traversal prevention', () => {
    it('should prevent path traversal via array arguments', async () => {
      const result = await execFileAsync('echo', ['../../../etc/passwd']);
      expect(result.stdout).toContain('../../../etc/passwd');
    });

    it('should execute command with safe file paths', async () => {
      const result = await execFileAsync('ls', ['/tmp']);
      expect(result.stderr).toBe('');
    });
  });

  describe('Error handling', () => {
    it('should handle command not found error', async () => {
      const result = await execFileAsync('nonexistent_command', []);
      expect(result.stderr).toBeTruthy();
    });

    it('should handle permission denied errors', async () => {
      const result = await execFileAsync('/root/nonexistent', []);
      expect(result.stderr).toBeTruthy();
    });

    it('should handle invalid arguments', async () => {
      const result = await execFileAsync('ls', ['--invalid-argument']);
      expect(result.stderr).toBeTruthy();
    });
  });

  describe('Real-world command examples', () => {
    it('should execute echo command with multiple arguments', async () => {
      const result = await execFileAsync('echo', ['hello', 'world', 'test']);
      expect(result.stdout).toContain('hello');
      expect(result.stdout).toContain('world');
      expect(result.stdout).toContain('test');
    });

    it('should execute command with path arguments', async () => {
      const result = await execFileAsync('echo', ['/tmp/test/path']);
      expect(result.stdout).toContain('/tmp/test/path');
    });

    it('should execute command with numeric argument', async () => {
      const result = await execFileAsync('sleep', ['0.1']);
      expect(result.stderr).toBe('');
    });
  });
});

describe('spawnAsync', () => {
  it('rejects a process terminated by a signal, even without stderr', async () => {
    await expect(spawnAsync(process.execPath, ['-e', 'process.kill(process.pid, "SIGTERM")'])).rejects.toThrow('SIGTERM');
  });

  it('rejects a nonzero exit even when the process writes a warning', async () => {
    await expect(spawnAsync(process.execPath, ['-e', 'console.error("archive incomplete"); process.exit(2)'])).rejects.toThrow('archive incomplete');
  });

  it('rejects when the executable cannot be started', async () => {
    await expect(spawnAsync('/nonexistent/runtipi-tar', [])).rejects.toThrow();
  });

  it('returns successful output while allowing warnings on stderr', async () => {
    await expect(spawnAsync(process.execPath, ['-e', 'console.log("done"); console.error("warning")'])).resolves.toEqual({
      stdout: 'done\n',
      stderr: 'warning\n',
    });
  });
});
