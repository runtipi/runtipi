import { EventEmitter } from 'node:events';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { DockerService } from '../docker.service';

const spawn = vi.hoisted(() => vi.fn());
vi.mock('node:child_process', async (original) => ({ ...(await original<typeof import('node:child_process')>()), spawn }));

describe('bounded log snapshots', () => {
  let docker: DockerService;
  let child: EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; kill: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [DockerService] })
      .useMocker(() => mock())
      .compile();
    docker = module.get(DockerService);
    vi.spyOn(docker, 'getBaseComposeArgsRuntipi').mockResolvedValue({ args: ['--project-name', 'runtipi'] });
    child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter(), kill: vi.fn() });
    spawn.mockReset();
    spawn.mockReturnValue(child);
  });

  afterEach(() => vi.useRealTimers());

  it('reads plain text without following the stream', async () => {
    const result = docker.getLogsSnapshot(100);
    await vi.waitFor(() => expect(spawn).toHaveBeenCalled());
    child.stdout.emit('data', Buffer.from('application output\n'));
    child.emit('close', 0);

    await expect(result).resolves.toEqual({ text: 'application output\n', truncated: false });
    expect(spawn).toHaveBeenCalledWith('docker-compose', ['--project-name', 'runtipi', 'logs', '--no-color', '--timestamps', '--tail', '100'], {
      stdio: 'pipe',
    });
  });

  it('caps output and terminates the process', async () => {
    const result = docker.getLogsSnapshot(1000);
    await vi.waitFor(() => expect(spawn).toHaveBeenCalled());
    child.stdout.emit('data', Buffer.alloc(300000, 'x'));
    child.emit('close', null);
    const snapshot = await result;

    expect(Buffer.byteLength(snapshot.text)).toBe(256 * 1024);
    expect(snapshot.truncated).toBe(true);
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('kills a hung log process on timeout', async () => {
    vi.useFakeTimers();
    const result = docker.getLogsSnapshot(100);
    const rejected = result.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(10000);

    expect(await rejected).toEqual(expect.objectContaining({ message: 'Log snapshot timed out' }));
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
  });
});
