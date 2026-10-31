import { execFile, spawn } from 'node:child_process';
import type { ExecFileOptions, SpawnOptionsWithoutStdio } from 'node:child_process';
import { promisify } from 'node:util';

type ExecFileAsyncParams = [command: string, args?: string[], options?: ExecFileOptions];

type ExecResult = { stdout: string; stderr: string };

const promisifiedExecFile = promisify(execFile);

export const execFileAsync = async (...args: ExecFileAsyncParams): Promise<ExecResult> => {
  const [command, cmdArgs = [], options = {}] = args;

  if (!command) {
    throw new Error('Command cannot be empty');
  }

  try {
    const { stdout, stderr } = await promisifiedExecFile(command, cmdArgs, {
      ...options,
      encoding: 'utf-8',
    });

    return { stdout, stderr };
  } catch (error) {
    if (error instanceof Error) {
      return { stderr: error.message, stdout: '' };
    }

    return { stderr: String(error), stdout: '' };
  }
};

export const spawnAsync = async (command: string, args: string[], options: SpawnOptionsWithoutStdio = {}) =>
  new Promise<ExecResult>((resolve, reject) => {
    const { signal, ...spawnOptions } = options;
    signal?.throwIfAborted();

    const child = spawn(command, args, {
      ...spawnOptions,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    let killTimer: ReturnType<typeof setTimeout> | undefined;

    const kill = (killSignal: NodeJS.Signals) => {
      if (!child.pid) return;

      try {
        process.kill(-child.pid, killSignal);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') reject(error);
      }
    };

    const abort = () => {
      kill('SIGTERM');
      killTimer = setTimeout(() => kill('SIGKILL'), 5000);
      killTimer.unref();
    };

    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();

    child.on('error', reject);

    child.on('close', (code, exitSignal) => {
      signal?.removeEventListener('abort', abort);
      if (signal?.aborted || code !== 0 || exitSignal) kill('SIGKILL');

      clearTimeout(killTimer);

      if (signal?.aborted) {
        reject(signal.reason);
        return;
      }

      if (code !== 0 || exitSignal) {
        const reason = exitSignal ? `terminated by ${exitSignal}` : `failed with exit code ${code}`;
        reject(new Error(`${command} ${reason}${stderr.trim() ? `: ${stderr.trim()}` : ''}`));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
