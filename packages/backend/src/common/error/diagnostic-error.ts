import { HttpException } from '@nestjs/common';
import { TranslatableError } from './translatable-error';

export const describeError = (error: unknown) => {
  let code: string | undefined;
  if (error instanceof TranslatableError) code = error.message;
  else if (error instanceof Error && 'code' in error && typeof error.code === 'string' && /^[A-Z0-9_]{1,64}$/.test(error.code)) code = error.code;

  let frames: string[] | undefined;
  if (error instanceof Error && error.stack) {
    const header = error.message ? `${error.name}: ${error.message}` : error.name;
    if (error.stack.startsWith(header)) {
      frames = error.stack
        .slice(header.length)
        .split('\n')
        .filter((line) => /^\s+at /.test(line));
    }
  }

  return {
    errorType: error instanceof Error ? error.name : typeof error,
    status: error instanceof HttpException ? error.getStatus() : undefined,
    code,
    frames,
  };
};
