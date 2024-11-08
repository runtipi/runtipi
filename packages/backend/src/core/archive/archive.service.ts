import { execAsync } from '@/common/helpers/exec-helpers';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ArchiveService {
  createTarGz = async (sourceDir: string, destinationFile: string) => {
    return execAsync(`tar -czf ${destinationFile} -C ${sourceDir} .`);
  };

  extractTarGz = async (sourceFile: string, destinationDir: string) => {
    return execAsync(`tar -xzf ${sourceFile} -C ${destinationDir}`);
  };
}
