import fs from 'node:fs';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class FilesystemService {
  constructor(private readonly logger: LoggerService) {}

  async readJsonFile<T>(filePath: string, schema?: ZodSchema<T>): Promise<T | null> {
    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      const parsedContent = JSON.parse(fileContent);

      if (schema) {
        const validatedContent = schema.safeParse(parsedContent);
        if (!validatedContent.success) {
          this.logger.debug(`File ${filePath} validation error:`, validatedContent.error);
          return null;
        }
        return validatedContent.data;
      }

      return parsedContent;
    } catch (error) {
      this.logger.error(`Error reading file ${filePath}: ${error}`);
      return null;
    }
  }

  async readTextFile(filePath: string): Promise<string | null> {
    try {
      return await fs.promises.readFile(filePath, 'utf8');
    } catch (error) {
      this.logger.error(`Error reading file ${filePath}: ${error}`);
      return null;
    }
  }

  async readBinaryFile(filePath: string): Promise<Buffer | null> {
    try {
      return await fs.promises.readFile(filePath);
    } catch (error) {
      this.logger.error(`Error reading file ${filePath}: ${error}`);
      return null;
    }
  }

  async writeJsonFile<T>(filePath: string, data: T): Promise<boolean> {
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      this.logger.error(`Error writing file ${filePath}: ${error}`);
      return false;
    }
  }

  async writeTextFile(filePath: string, content: string): Promise<boolean> {
    try {
      await fs.promises.mkdir(filePath.split('/').slice(0, -1).join('/'), { recursive: true });
      await fs.promises.writeFile(filePath, content, 'utf8');
      return true;
    } catch (error) {
      this.logger.error(`Error writing file ${filePath}: ${error}`);
      return false;
    }
  }

  async pathExists(filePath: string): Promise<boolean> {
    return fs.promises
      .access(filePath)
      .then(() => true)
      .catch(() => false);
  }

  async copyFile(src: string, dest: string): Promise<boolean> {
    try {
      await fs.promises.copyFile(src, dest);
      return true;
    } catch (error) {
      this.logger.error(`Error copying file from ${src} to ${dest}: ${error}`);
      return false;
    }
  }

  async createDirectory(dirPath: string): Promise<boolean> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      this.logger.error(`Error creating directory ${dirPath}: ${error}`);
      return false;
    }
  }

  async createDirectories(dirPaths: string[]): Promise<boolean> {
    for (const dirPath of dirPaths) {
      if (!(await this.createDirectory(dirPath))) {
        return false;
      }
    }
    return true;
  }

  async copyDirectory(src: string, dest: string, options: fs.CopyOptions = {}): Promise<boolean> {
    try {
      await fs.promises.cp(src, dest, { recursive: true, ...options });
      return true;
    } catch (error) {
      this.logger.error(`Error copying directory from ${src} to ${dest}: ${error}`);
      return false;
    }
  }

  async removeDirectory(dirPath: string): Promise<boolean> {
    try {
      await fs.promises.rm(dirPath, { recursive: true, force: true });
      return true;
    } catch (error) {
      this.logger.error(`Error removing directory ${dirPath}: ${error}`);
      return false;
    }
  }

  async removeFile(filePath: string): Promise<boolean> {
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch (error) {
      this.logger.error(`Error removing file ${filePath}: ${error}`);
      return false;
    }
  }

  async listFiles(dirPath: string): Promise<string[]> {
    try {
      return await fs.promises.readdir(dirPath);
    } catch (error) {
      this.logger.error(`Error listing files in ${dirPath}: ${error}`);
      return [];
    }
  }

  async isDirectory(dirPath: string): Promise<boolean> {
    return (await fs.promises.lstat(dirPath)).isDirectory();
  }

  async createTempDirectory(prefix: string): Promise<string | null> {
    return fs.promises.mkdtemp(prefix);
  }

  async getStats(filePath: string) {
    return await fs.promises.stat(filePath);
  }
}
