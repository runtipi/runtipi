import { execAsync } from '@/common/helpers/exec-helpers';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ArchiveService {
  createTarGz = async (sourceDir: string, destinationFile: string) => {
    return execAsync(`tar -czf ${destinationFile} -C ${sourceDir} .`);
  };

  extractTarGz = async (sourceFile: string, destinationDir: string) => {
    const fileType = await execAsync(`file --brief --mime-type ${sourceFile}`);
    const mimeType = fileType.stdout.trim();

    let tarCommand = `tar -xzf ${sourceFile} -C ${destinationDir}`;

    // Support for legacy tarballs without the 'z' flag
    if (mimeType === 'application/x-tar') {
      tarCommand = `tar -xf ${sourceFile} -C ${destinationDir}`;
    }

    return await execAsync(tarCommand);
  };
}
