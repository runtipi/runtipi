import { execAsync } from '@/common/helpers/exec-helpers';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ArchiveService {
  constructor(private readonly logger: LoggerService) {}

  createTarGz = async (sourceDir: string, destinationFile: string) => {
    const tarCommand = `tar -czf ${destinationFile} -C ${sourceDir} --preserve-permissions --acls --xattrs .`;
    this.logger.debug(`Creating archive with command: ${tarCommand}`);
    return execAsync(tarCommand);
  };

  extractTarGz = async (sourceFile: string, destinationDir: string) => {
    const fileType = await execAsync(`file --brief --mime-type ${sourceFile}`);
    const mimeType = fileType.stdout.trim();

    let tarCommand = `tar -xzf ${sourceFile} -C ${destinationDir} --preserve-permissions --preserve-order --acls --xattrs`;

    if (mimeType === 'application/x-tar') {
      tarCommand = `tar -xf ${sourceFile} -C ${destinationDir} --preserve-permissions --preserve-order --acls --xattrs`;
    }

    this.logger.debug(`Extracting archive with command: ${tarCommand}`);
    return await execAsync(tarCommand);
  };
}
