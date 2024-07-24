import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { pack, extract, Pack } from 'tar-stream';

import { Writable } from 'stream';

export class ArchiveManager {
  private async addFilesToTar(pack: Pack, dir: string, parent = '') {
    const files = await fs.promises.readdir(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await fs.promises.stat(filePath);
      const tarPath = path.join(parent, file);

      if (stats.isDirectory()) {
        await this.addFilesToTar(pack, filePath, tarPath);
      } else {
        const fileContent = await fs.promises.readFile(filePath);
        pack.entry({ name: tarPath }, fileContent);
      }
    }
  }

  createTarGz = async (sourceDir: string, destinationFile: string) => {
    return new Promise<void>((resolve, reject) => {
      const myPack = pack(); // Create a tar pack stream
      const gzip = zlib.createGzip(); // Create a gzip stream

      this.addFilesToTar(myPack, sourceDir)
        .then(() => {
          myPack.finalize();

          // Collect the compressed tarball in memory
          const chunks: Buffer[] = [];
          const writable = new Writable({
            write(chunk, _, callback) {
              chunks.push(chunk);
              callback();
            },
          });

          writable.on('finish', async () => {
            const buffer = Buffer.concat(chunks);
            await fs.promises.writeFile(destinationFile, buffer);
            resolve();
          });

          writable.on('error', (err) => {
            reject(err);
          });

          myPack.pipe(gzip).pipe(writable);
        })
        .catch(reject);
    });
  };

  extractTarGz = async (sourceFile: string, destinationDir: string) => {
    return new Promise<void>((resolve, reject) => {
      fs.promises
        .readFile(sourceFile)
        .then((buffer) => {
          const extractor = extract();
          const gunzip = zlib.createGunzip();

          extractor.on('entry', async (header, stream, next) => {
            const filePath = path.join(destinationDir, header.name);

            if (header.type === 'directory') {
              await fs.promises.mkdir(filePath, { recursive: true });
              next();
            } else {
              const chunks: Buffer[] = [];
              stream.on('data', (chunk) => {
                chunks.push(chunk);
              });
              stream.on('end', async () => {
                const dir = path.dirname(filePath);
                await fs.promises.mkdir(dir, { recursive: true });
                await fs.promises.writeFile(filePath, Buffer.concat(chunks));
                next();
              });
            }
          });

          extractor.on('finish', () => {
            resolve();
          });

          extractor.on('error', (err) => {
            reject(err);
          });

          gunzip.pipe(extractor);
          gunzip.write(buffer);
          gunzip.end();
        })
        .catch(reject);
    });
  };
}
