import type { LoggerService } from '@/core/logger/logger.service';
import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { TranslatableError } from './translatable-error';

@Catch()
export class MainExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`An error occured while calling: ${request.url}`, exception);
    }

    // @ts-expect-error
    const error = exception?.error;
    if (error instanceof ZodError) {
      this.logger.error('Schema validation failed: ', request.path, JSON.stringify(error.errors, null, 2));
    }

    if (exception instanceof Error && status !== HttpStatus.INTERNAL_SERVER_ERROR) {
      message = exception.message;
    }

    let intlParams: Record<string, string | undefined> | undefined;
    if (exception instanceof TranslatableError) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
      } else {
        // @ts-expect-error
        message = response.message;
        // @ts-expect-error
        intlParams = response.intlParams;
      }
    }

    if (status >= 500 && !(exception instanceof TranslatableError)) {
      Sentry.captureException(exception, {
        tags: {
          url: request.url,
          status,
        },
      });
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      intlParams,
    });
  }
}
