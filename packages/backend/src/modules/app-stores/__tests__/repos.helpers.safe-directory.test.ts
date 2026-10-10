import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { ReposHelpers } from '@/modules/app-stores/repos.helpers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type MockProxy, mock } from 'vitest-mock-extended';

/**
 * Regression test for the upstream append bug: every cloneRepo() call (including the
 * "repo already exists" path) used to run `git config --global --add safe.directory`
 * unconditionally, so the global gitconfig grew by one duplicate line per call.
 *
 * The git child process reads a real file, so the global config is a real temp file
 * pointed to by GIT_CONFIG_GLOBAL. The real ~/.gitconfig is never touched.
 *
 * The backend test setup replaces `fs` with an in-memory volume, so the real module is
 * loaded via vi.importActual for the temp file. The helper's own directory handling
 * runs against the in-memory volume, which is what the test expects.
 */
describe('ReposHelpers safe.directory handling', () => {
  let realFs: typeof import('node:fs');
  let tmpDir: string;
  let gitConfigFile: string;
  let repoParent: string;
  let previousGitConfigGlobal: string | undefined;
  let filesystem: MockProxy<FilesystemService>;
  let helpers: ReposHelpers;

  const readSafeDirectories = (): string[] => {
    try {
      const output = execFileSync('git', ['config', '--global', '--get-all', 'safe.directory'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return output.split('\n').filter((line) => line.length > 0);
    } catch {
      return [];
    }
  };

  // Private method; reached the same way cloneRepo() reaches it. Kept private on purpose.
  const ensure = (dirPath: string) =>
    // biome-ignore lint/complexity/useLiteralKeys: private method under test
    helpers['ensureDirectoryWithPermissions'](dirPath);

  beforeEach(async () => {
    realFs = (await vi.importActual<{ default: typeof import('node:fs') }>('node:fs')).default;

    tmpDir = realFs.mkdtempSync(path.join(os.tmpdir(), 'safe-directory-test-'));
    gitConfigFile = path.join(tmpDir, 'gitconfig');
    realFs.writeFileSync(gitConfigFile, '');

    repoParent = path.join(tmpDir, 'repos');
    fs.mkdirSync(repoParent, { recursive: true });

    previousGitConfigGlobal = process.env.GIT_CONFIG_GLOBAL;
    process.env.GIT_CONFIG_GLOBAL = gitConfigFile;

    filesystem = mock<FilesystemService>();
    filesystem.pathExists.mockResolvedValue(true);
    helpers = new ReposHelpers(mock<LoggerService>(), mock<ConfigurationService>(), filesystem);
  });

  afterEach(() => {
    if (previousGitConfigGlobal === undefined) {
      delete process.env.GIT_CONFIG_GLOBAL;
    } else {
      process.env.GIT_CONFIG_GLOBAL = previousGitConfigGlobal;
    }
    realFs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('adds the safe.directory entry once when called repeatedly', async () => {
    for (let i = 0; i < 5; i++) {
      await ensure(repoParent);
    }

    expect(readSafeDirectories()).toEqual([repoParent]);
  });

  it('keeps unrelated safe.directory entries and still adds a new path', async () => {
    const other = path.join(tmpDir, 'other');
    execFileSync('git', ['config', '--global', '--add', 'safe.directory', other]);

    await ensure(repoParent);
    await ensure(repoParent);

    expect(readSafeDirectories().sort()).toEqual([other, repoParent].sort());
  });

  it('does not write to the config when the entry already exists', async () => {
    await ensure(repoParent);
    const before = realFs.readFileSync(gitConfigFile, 'utf8');

    await ensure(repoParent);

    expect(realFs.readFileSync(gitConfigFile, 'utf8')).toBe(before);
  });
});
