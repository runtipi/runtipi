import { fromPartial } from '@total-typescript/shoehorn';
import type Dockerode from 'dockerode';
import { afterEach, expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { ContainerMemoryReader } from '../metrics/container-memory';

const setup = () => {
  const docker = mock<Dockerode>();
  const stats = vi.fn<() => Promise<Dockerode.ContainerStats>>();
  docker.listContainers.mockResolvedValue([fromPartial({ Id: 'one' })]);
  docker.getContainer.mockReturnValue(fromPartial({ stats }));
  stats.mockResolvedValue(fromPartial({ memory_stats: { usage: 1000, stats: { inactive_file: 100, active_file: 200 } } }));

  return { reader: new ContainerMemoryReader(docker), docker, stats };
};

afterEach(() => {
  vi.useRealTimers();
});

test('reuses a successful sample during its cache lifetime', async () => {
  const { reader, stats } = setup();

  expect(await reader.getMemory()).toBe(700);
  stats.mockResolvedValue(fromPartial({ memory_stats: { usage: 2000, stats: {} } }));

  expect(await reader.getMemory()).toBe(700);
});

test('shares an in-flight sample between simultaneous requests', async () => {
  const { reader, docker } = setup();
  const results = await Promise.all([reader.getMemory(), reader.getMemory(), reader.getMemory()]);

  expect(results).toEqual([700, 700, 700]);
  expect(docker.listContainers).toHaveBeenCalledTimes(1);
});

test('preserves the last good reading on failure without delaying the next retry', async () => {
  vi.useFakeTimers();
  const { reader, docker, stats } = setup();

  expect(await reader.getMemory()).toBe(700);
  vi.advanceTimersByTime(10_001);
  docker.listContainers.mockRejectedValueOnce(new Error('temporary socket error'));

  expect(await reader.getMemory()).toBe(700);
  stats.mockResolvedValue(fromPartial({ memory_stats: { usage: 1500, stats: {} } }));

  expect(await reader.getMemory()).toBe(1500);
});

test('never caches a partial total when one container stats request fails', async () => {
  vi.useFakeTimers();
  const { reader, docker, stats } = setup();

  expect(await reader.getMemory()).toBe(700);
  vi.advanceTimersByTime(10_001);
  docker.listContainers.mockResolvedValue([fromPartial({ Id: 'one' }), fromPartial({ Id: 'two' })]);
  stats.mockResolvedValueOnce(fromPartial({ memory_stats: { usage: 100, stats: {} } })).mockRejectedValueOnce(new Error('socket error'));

  expect(await reader.getMemory()).toBe(700);
  expect(await reader.getMemory()).toBe(1400);
});

test('ignores a container removed between listing and sampling', async () => {
  const { reader, stats } = setup();
  stats.mockRejectedValueOnce(Object.assign(new Error('no such container'), { statusCode: 404 }));

  expect(await reader.getMemory()).toBe(0);
});

test('does not treat missing memory accounting as a valid zero', async () => {
  const { reader, stats } = setup();
  stats.mockResolvedValueOnce(fromPartial({}));

  await expect(reader.getMemory()).rejects.toThrow('Missing memory accounting');
  expect(await reader.getMemory()).toBe(700);
});

test('accepts an empty running-container list as a valid zero', async () => {
  const { reader, docker } = setup();
  docker.listContainers.mockResolvedValue([]);

  expect(await reader.getMemory()).toBe(0);
});
