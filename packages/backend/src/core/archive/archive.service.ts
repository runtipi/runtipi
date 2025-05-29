import { execAsync } from '@/common/helpers/exec-helpers';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ArchiveService {
  constructor(private readonly logger: LoggerService) {}

  createTarGz = async (sourceDir: string, destinationFile: string) => {
    const tarCommand = `tar -czpf ${destinationFile} -C ${sourceDir} .`;
    this.logger.debug(`Creating archive with command: ${tarCommand}`);
    return execAsync(tarCommand);
  };

  extractTarGz = async (sourceFile: string, destinationDir: string) => {
    const fileType = await execAsync(`file --brief --mime-type ${sourceFile}`);
    const mimeType = fileType.stdout.trim();

    let tarCommand = `tar -xzpf ${sourceFile} -C ${destinationDir}`;

    if (mimeType === 'application/x-tar') {
      tarCommand = `tar -xpf ${sourceFile} -C ${destinationDir}`;
    }

    this.logger.debug(`Extracting archive with command: ${tarCommand}`);
    return await execAsync(tarCommand);
  };
}
