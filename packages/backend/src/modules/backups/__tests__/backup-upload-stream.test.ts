import fs from 'node:fs';
import { Readable } from 'node:stream';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { fromPartial } from '@total-typescript/shoehorn';
import { castAppUrn } from '@/common/helpers/app-helpers';
import { ArchiveService } from '@/core/archive/archive.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { AppFilesManager } from '@/modules/apps/app-files-manager';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { DockerService } from '@/modules/docker/docker.service';
import { BackupManager } from '../backup.manager';

const urn = castAppUrn('app:store');
const directory = '/data/backups/store/app';

const manager = () => {
  const logger = mock<LoggerService>();
  const config = mock<ConfigurationService>();
  config.get.calledWith('directories').mockReturnValue(fromPartial({ dataDir: '/data' }));
  return new BackupManager(
    mock<ArchiveService>(),
    logger,
    config,
    new FilesystemService(logger),
    mock<AppFilesManager>(),
    mock<AppsRepository>(),
    mock<DockerService>(),
  );
};

test('publishes complete streamed backups privately and refuses to overwrite an existing backup', async () => {
  const backups = manager();
  await backups.uploadBackupStream(urn, 'backup.tar.gz', Readable.from([Buffer.from('first'), Buffer.from('second')]));

  expect(await fs.promises.readFile(`${directory}/backup.tar.gz`, 'utf8')).toBe('firstsecond');
  expect((await fs.promises.stat(`${directory}/backup.tar.gz`)).mode & 0o777).toBe(0o600);
  await expect(backups.uploadBackupStream(urn, 'backup.tar.gz', Readable.from(['replacement']))).rejects.toThrow('already exists');
  expect(await fs.promises.readFile(`${directory}/backup.tar.gz`, 'utf8')).toBe('firstsecond');
  expect(await fs.promises.readdir(directory)).toEqual(['backup.tar.gz']);
});

test('removes staging files when the upload stream is interrupted', async () => {
  const source = Readable.from(
    (async function* () {
      yield Buffer.from('partial');
      throw new Error('Upload interrupted');
    })(),
  );

  await expect(manager().uploadBackupStream(urn, 'backup.tar.gz', source)).rejects.toThrow('Upload interrupted');
  expect(await fs.promises.readdir(directory)).toEqual([]);
});
