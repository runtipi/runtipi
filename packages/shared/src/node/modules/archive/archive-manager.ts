import { execAsync } from 'src/node/helpers/exec-async';

export class ArchiveManager {
  createTarGz = async (sourceDir: string, destinationFile: string) => {
    return execAsync(`tar -czf ${destinationFile} -C ${sourceDir} .`);
  };

  extractTarGz = async (sourceFile: string, destinationDir: string) => {
    return execAsync(`tar -xzf ${sourceFile} -C ${destinationDir}`);
  };
}
