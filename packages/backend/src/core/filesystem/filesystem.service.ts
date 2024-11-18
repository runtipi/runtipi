import fs from 'node:fs';
import { EOL } from 'node:os';
import path from 'node:path';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { ConfigurationService } from '../config/configuration.service';

@Injectable()
export class FilesystemService {
  constructor(
    private readonly logger: LoggerService,
    private readonly configuration: ConfigurationService,
  ) {}

  private getSafeFilePath(filePath: string): string {
    const { appDir, appDataDir, dataDir } = this.configuration.get('directories');

    // Define allowed directories as absolute paths
    const allowedDirs = [path.resolve(appDir), path.resolve(appDataDir), path.resolve(dataDir), path.resolve('/host/proc/'), path.resolve('/tmp/')];

    // Resolve and normalize the file path to an absolute path
    const resolvedPath = path.resolve(filePath);

    for (const dir of allowedDirs) {
      if (path.relative(dir, resolvedPath).startsWith('..')) {
        continue; // If relative path starts with '..', it's outside the allowed dir
      }

      return resolvedPath;
    }

    this.logger.error(`File path "${filePath}" is not allowed. Resolved: "${resolvedPath}"`);
    throw new Error('File path is not allowed');
  }

  async readJsonFile<T>(filePath: string, schema?: ZodSchema<T>): Promise<T | null> {
    try {
      const fileContent = await fs.promises.readFile(this.getSafeFilePath(filePath), 'utf8');
      const parsedContent = JSON.parse(fileContent);

      if (schema) {
        const validatedContent = schema.safeParse(parsedContent);
        if (!validatedContent.success) {
          this.logger.debug(`File ${this.getSafeFilePath(filePath)} validation error:`, validatedContent.error);
          return null;
        }
        return validatedContent.data;
      }

      return parsedContent;
    } catch (error) {
      this.logger.error(`Error reading file ${this.getSafeFilePath(filePath)}: ${error}`);
      return null;
    }
  }

  async readTextFile(filePath: string): Promise<string | null> {
    try {
      return await fs.promises.readFile(this.getSafeFilePath(filePath), 'utf8');
    } catch (error) {
      this.logger.error(`Error reading file ${this.getSafeFilePath(filePath)}: ${error}`);
      return null;
    }
  }

  async readBinaryFile(filePath: string): Promise<Buffer | null> {
    try {
      return await fs.promises.readFile(this.getSafeFilePath(filePath));
    } catch (error) {
      this.logger.error(`Error reading file ${this.getSafeFilePath(filePath)}: ${error}`);
      return null;
    }
  }

  async writeJsonFile<T>(filePath: string, data: T): Promise<boolean> {
    try {
      await fs.promises.writeFile(this.getSafeFilePath(filePath), `${JSON.stringify(data, null, 2)}${EOL}`, 'utf8');
      return true;
    } catch (error) {
      this.logger.error(`Error writing file ${this.getSafeFilePath(filePath)}: ${error}`);
      return false;
    }
  }

  async writeTextFile(filePath: string, content: string): Promise<boolean> {
    try {
      await fs.promises.mkdir(this.getSafeFilePath(filePath.split('/').slice(0, -1).join('/')), { recursive: true });
      await fs.promises.writeFile(this.getSafeFilePath(filePath), `${content}${EOL}`, 'utf8');
      return true;
    } catch (error) {
      this.logger.error(`Error writing file ${this.getSafeFilePath(filePath)}: ${error}`);
      return false;
    }
  }

  async pathExists(filePath: string): Promise<boolean> {
    return fs.promises
      .access(this.getSafeFilePath(filePath))
      .then(() => true)
      .catch(() => false);
  }

  async copyFile(src: string, dest: string): Promise<boolean> {
    try {
      await fs.promises.copyFile(this.getSafeFilePath(src), this.getSafeFilePath(dest));
      return true;
    } catch (error) {
      this.logger.error(`Error copying file from ${this.getSafeFilePath(src)} to ${this.getSafeFilePath(dest)}: ${error}`);
      return false;
    }
  }

  async createDirectory(dirPath: string): Promise<boolean> {
    try {
      await fs.promises.mkdir(this.getSafeFilePath(dirPath), { recursive: true });
      return true;
    } catch (error) {
      this.logger.error(`Error creating directory ${this.getSafeFilePath(dirPath)}: ${error}`);
      return false;
    }
  }

  async createDirectories(dirPaths: string[]): Promise<boolean> {
    for (const dirPath of dirPaths) {
      if (!(await this.createDirectory(this.getSafeFilePath(dirPath)))) {
        return false;
      }
    }
    return true;
  }

  async copyDirectory(src: string, dest: string, options: fs.CopyOptions = {}): Promise<boolean> {
    try {
      await fs.promises.cp(this.getSafeFilePath(src), this.getSafeFilePath(dest), { recursive: true, ...options });
      return true;
    } catch (error) {
      this.logger.error(`Error copying directory from ${this.getSafeFilePath(src)} to ${this.getSafeFilePath(dest)}: ${error}`);
      return false;
    }
  }

  async removeDirectory(dirPath: string): Promise<boolean> {
    try {
      await fs.promises.rm(this.getSafeFilePath(dirPath), { recursive: true, force: true });
      return true;
    } catch (error) {
      this.logger.error(`Error removing directory ${this.getSafeFilePath(dirPath)}: ${error}`);
      return false;
    }
  }

  async removeFile(filePath: string): Promise<boolean> {
    try {
      await fs.promises.unlink(this.getSafeFilePath(filePath));
      return true;
    } catch (error) {
      this.logger.error(`Error removing file ${this.getSafeFilePath(filePath)}: ${error}`);
      return false;
    }
  }

  async listFiles(dirPath: string): Promise<string[]> {
    try {
      return await fs.promises.readdir(this.getSafeFilePath(dirPath));
    } catch (error) {
      this.logger.error(`Error listing files in ${this.getSafeFilePath(dirPath)}: ${error}`);
      return [];
    }
  }

  async isDirectory(dirPath: string): Promise<boolean> {
    return (await fs.promises.lstat(this.getSafeFilePath(dirPath))).isDirectory();
  }

  async createTempDirectory(prefix: string): Promise<string | null> {
    return fs.promises.mkdtemp(prefix);
  }

  async getStats(filePath: string) {
    return await fs.promises.stat(this.getSafeFilePath(filePath));
  }
}
