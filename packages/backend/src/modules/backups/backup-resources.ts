import fs from 'node:fs';
import type { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { LoggerService } from '@/core/logger/logger.service';
import { Cause, Chunk, Effect, Exit } from 'effect';

export const backupStep = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({
    try: operation,
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  });

export async function runBackupEffect<A, E>(effect: Effect.Effect<A, E>) {
  const result = await Effect.runPromiseExit(effect);
  if (Exit.isFailure(result)) {
    const errors = [...Chunk.toReadonlyArray(Cause.failures(result.cause)), ...Chunk.toReadonlyArray(Cause.defects(result.cause))];
    if (errors.length > 1) {
      throw new AggregateError(errors, 'Backup operation and recovery failed');
    }
    throw Cause.squash(result.cause);
  }

  return result.value;
}

export async function requireFilesystemSuccess(operation: Promise<boolean>, message: string) {
  if (!(await operation)) {
    throw new Error(message);
  }
}

export class BackupResources {
  constructor(
    private readonly filesystem: FilesystemService,
    private readonly logger: LoggerService,
  ) {}

  temporaryDirectory(prefix: string) {
    return Effect.acquireRelease(
      backupStep(async () => {
        const directory = await this.filesystem.createTempDirectory(prefix);
        if (!directory) {
          throw new Error('Failed to create temp directory');
        }

        return directory;
      }),
      (directory) => this.cleanupDirectory(directory),
    );
  }

  fileHandle(file: string, flags: number) {
    return Effect.acquireRelease(
      backupStep(() => fs.promises.open(file, flags)),
      (handle) => this.cleanup(() => handle.close(), `Failed to close backup file ${file}`),
    );
  }

  cleanupDirectory(directory: string) {
    return this.cleanup(
      () => requireFilesystemSuccess(this.filesystem.removeDirectory(directory), `Failed to remove directory ${directory}`),
      `Backup cleanup will need to be retried for ${directory}`,
    );
  }

  private cleanup(operation: () => Promise<void>, message: string) {
    return backupStep(operation).pipe(Effect.catchAll((error) => Effect.sync(() => this.logger.warn(message, error))));
  }
}
