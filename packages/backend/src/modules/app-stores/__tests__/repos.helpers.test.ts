import fs from 'node:fs';
import path from 'node:path';
import type { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import { fromPartial } from '@total-typescript/shoehorn';
import git from 'isomorphic-git';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, expect, onTestFinished, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { ReposHelpers } from '../repos.helpers';

const repoUrl = 'https://store.test/repo';
const server = setupServer();

const packetLine = (payload: string | Uint8Array) => {
  const body = Buffer.from(payload);
  const length = (body.length + 4).toString(16).padStart(4, '0');

  return Buffer.concat([Buffer.from(length), body]);
};

const publishStore = async (dir: string, content: string) => {
  await git.init({ fs, dir, defaultBranch: 'main' });

  const blob = await git.writeBlob({ fs, dir, blob: Buffer.from(content) });
  const tree = await git.writeTree({ fs, dir, tree: [{ mode: '100644', path: 'config.json', oid: blob, type: 'blob' }] });
  const author = { name: 'Test', email: 'test@example.com', timestamp: 0, timezoneOffset: 0 };
  const commit = await git.writeCommit({ fs, dir, commit: { tree, parent: [], author, committer: author, message: 'Store snapshot' } });
  const { packfile } = await git.packObjects({ fs, dir, oids: [commit, tree, blob], write: false });
  if (!packfile) {
    throw new Error('Expected an in-memory packfile');
  }

  const advertisement = Buffer.concat([
    packetLine('# service=git-upload-pack\n'),
    Buffer.from('0000'),
    packetLine(`${commit} HEAD\0side-band-64k shallow symref=HEAD:refs/heads/main\n`),
    packetLine(`${commit} refs/heads/main\n`),
    Buffer.from('0000'),
  ]);
  const uploadPack = Buffer.concat([packetLine('NAK\n'), packetLine(Buffer.concat([Buffer.from([1]), packfile])), Buffer.from('0000')]);

  server.use(
    http.get(
      `${repoUrl}/info/refs`,
      () => new HttpResponse(advertisement, { headers: { 'Content-Type': 'application/x-git-upload-pack-advertisement' } }),
    ),
    http.post(
      `${repoUrl}/git-upload-pack`,
      () => new HttpResponse(uploadPack, { headers: { 'Content-Type': 'application/x-git-upload-pack-result' } }),
    ),
  );
};

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

const setup = async () => {
  const realFs = (await vi.importActual<{ default: typeof fs }>('node:fs')).default;
  const dataDir = await realFs.promises.mkdtemp('/tmp/runtipi-repos-');
  onTestFinished(() => realFs.promises.rm(dataDir, { recursive: true, force: true }));

  const gitConfigFile = path.join(dataDir, 'gitconfig');
  vi.stubEnv('GIT_CONFIG_GLOBAL', gitConfigFile);
  vi.stubEnv('PATH', dataDir);

  const configuration = mock<ConfigurationService>();
  configuration.get.mockReturnValue(fromPartial({ dataDir }));

  const logger = mock<LoggerService>();
  const filesystem = new FilesystemService(logger);
  const helpers = new ReposHelpers(logger, configuration, filesystem);

  return { helpers, dataDir, gitConfigFile, realFs };
};

test.each([
  { name: 'missing', content: undefined },
  { name: 'populated', content: '[safe]\n\tdirectory = /another/repo\n[user]\n\tname = Test\n' },
  { name: 'bloated', content: `[safe]\n${'\tdirectory = /data/repos\n'.repeat(100_000)}` },
  { name: 'malformed', content: '\0\0\0' },
])('clones and pulls repositories independently of $name global Git config', async ({ content }) => {
  const { helpers, dataDir, gitConfigFile, realFs } = await setup();
  if (content !== undefined) {
    await realFs.promises.writeFile(gitConfigFile, content);
    await realFs.promises.utimes(gitConfigFile, 0, 0);
  }

  const remoteDir = path.join(dataDir, 'remote');
  await publishStore(remoteDir, 'initial store config');

  await expect(helpers.cloneRepo(repoUrl, 'store')).resolves.toEqual({ success: true, message: '' });

  const reposDir = path.join(dataDir, 'repos');
  const repoPath = path.join(reposDir, 'store');
  await expect(fs.promises.readFile(path.join(repoPath, 'config.json'), 'utf8')).resolves.toBe('initial store config');
  await fs.promises.chmod(reposDir, 0o700);

  for (let refresh = 0; refresh < 3; refresh++) {
    await expect(helpers.cloneRepo(repoUrl, 'store')).resolves.toEqual({ success: true, message: '' });
  }

  expect((await fs.promises.stat(reposDir)).mode & 0o777).toBe(0o755);

  await publishStore(remoteDir, 'updated store config');
  await expect(helpers.pullRepo(repoUrl, 'store')).resolves.toEqual({ success: true, message: '' });
  await expect(fs.promises.readFile(path.join(repoPath, 'config.json'), 'utf8')).resolves.toBe('updated store config');

  if (content === undefined) {
    await expect(realFs.promises.stat(gitConfigFile)).rejects.toMatchObject({ code: 'ENOENT' });
  } else {
    await expect(realFs.promises.readFile(gitConfigFile, 'utf8')).resolves.toBe(content);
    expect((await realFs.promises.stat(gitConfigFile)).mtimeMs).toBe(0);
  }
});

test('reports clone failures when the remote is unavailable', async () => {
  const { helpers } = await setup();
  server.use(http.get(`${repoUrl}/info/refs`, () => new HttpResponse(null, { status: 503 })));

  await expect(helpers.cloneRepo(repoUrl, 'store')).resolves.toEqual({ success: false, message: expect.stringContaining('503') });
});
