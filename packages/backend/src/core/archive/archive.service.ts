import { spawnAsync } from '@/common/helpers/exec-helpers';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';

export type ArchiveEntry = { path: string; type: string };

@Injectable()
export class ArchiveService {
  constructor(private readonly logger: LoggerService) {}

  createTarGz = async (sourceDir: string, destinationFile: string) => {
    const args = ['-czpf', destinationFile, '-C', sourceDir, '.'];
    this.logger.debug(`Creating archive with args: tar ${args.join(' ')}`);
    return spawnAsync('tar', args);
  };

  extractTarGz = async (sourceFile: string, destinationDir: string) => {
    const fileType = await spawnAsync('file', ['--brief', '--mime-type', sourceFile]);
    const mimeType = fileType.stdout.trim();

    let args = ['-xzpf', sourceFile, '-C', destinationDir];

    if (mimeType === 'application/x-tar') {
      args = ['-xpf', sourceFile, '-C', destinationDir];
    }

    this.logger.debug(`Extracting archive with args: tar ${args.join(' ')}`);
    return await spawnAsync('tar', args);
  };

  listTarGz = async (sourceFile: string): Promise<ArchiveEntry[]> => {
    const fileType = await spawnAsync('file', ['--brief', '--mime-type', sourceFile]);
    const mimeType = fileType.stdout.trim();

    const verboseArgs = mimeType === 'application/x-tar' ? ['-tvf', sourceFile] : ['-tzvf', sourceFile];
    const pathArgs = mimeType === 'application/x-tar' ? ['-tf', sourceFile] : ['-tzf', sourceFile];

    this.logger.debug(`Listing archive with args: tar ${verboseArgs.join(' ')}`);
    const [verboseList, pathList] = await Promise.all([spawnAsync('tar', verboseArgs), spawnAsync('tar', pathArgs)]);

    if (verboseList.stderr.trim() || pathList.stderr.trim()) {
      throw new Error('Invalid backup archive');
    }

    const verboseLines = verboseList.stdout.split('\n').filter(Boolean);
    const paths = pathList.stdout.split('\n').filter(Boolean);

    if (verboseLines.length !== paths.length) {
      throw new Error('Invalid backup archive');
    }

    return paths.map((entryPath, index) => ({ path: entryPath, type: verboseLines[index]?.[0] ?? '' }));
  };
}
