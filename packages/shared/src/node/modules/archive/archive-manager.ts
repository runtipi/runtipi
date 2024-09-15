import fs from 'node:fs';
import gunzip from 'gunzip-maybe';
import { extract, pack } from 'tar-fs';

export class ArchiveManager {
  createTarGz = async (sourceDir: string, destinationFile: string) => {
    return new Promise<void>((resolve, reject) => {
      pack(sourceDir).pipe(gunzip()).pipe(fs.createWriteStream(destinationFile)).on('finish', resolve).on('error', reject);
    });
  };

  extractTarGz = async (sourceFile: string, destinationDir: string) => {
    return new Promise<void>((resolve, reject) => {
      fs.createReadStream(sourceFile).pipe(gunzip()).pipe(extract(destinationDir)).on('finish', resolve).on('error', reject);
    });
  };
}
