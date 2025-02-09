import type { ErrorEvent, EventHint } from '@sentry/core';
import cloneDeep from 'lodash.clonedeep';
import validator from 'validator';

const IgnoreErrors = [
  // Innocuous browser errors
  /ResizeObserver loop limit exceeded/,
  /ResizeObserver loop completed with undelivered notifications/,
  // Dark reader extension
  /WeakMap key undefined must be an object or an unregistered symbol/,
  // Docker-compose error
  /no space left on device/,
  /port is already allocated/,
  /address already in use/,
  /Error with your custom app/,
  /cannot assign requested address/,
];

const cleanseUrl = (url: string) => {
  if (validator.isURL(url)) {
    const { pathname, search } = new URL(url);

    return `${pathname}${search}`;
  }

  return url;
};

const shouldIgnoreException = (s: string) => {
  return s && IgnoreErrors.find((pattern) => pattern.test(s));
};

export const cleanseErrorData = (event: ErrorEvent, hint: EventHint) => {
  const result = cloneDeep(event);

  const error = hint && (hint.originalException as Error);

  if (result.transaction) {
    result.transaction = cleanseUrl(result.transaction);
  }

  if (result.breadcrumbs) {
    for (const breadcrumb of result.breadcrumbs) {
      if (breadcrumb.data?.url) {
        breadcrumb.data.url = cleanseUrl(breadcrumb.data.url);
      }
    }
  }

  if (result.exception?.values) {
    for (const exception of result.exception.values) {
      if (exception.stacktrace?.frames) {
        for (const frame of exception.stacktrace.frames) {
          if (frame.filename) {
            frame.filename = cleanseUrl(frame.filename);
          }
        }
      }
    }
  }

  if (error?.message && shouldIgnoreException(error.message)) {
    return null;
  }

  // IF error message starts with 'Command failed: docker-compose' then grab only the 200 last characters
  if (error?.message?.startsWith('Command failed: docker-compose')) {
    // Command failed: docker-compose --env-file /storage/app-data/<app-name>/app.env
    const appName = error.message.split('/')[3];
    const message = error.message.slice(-200);
    result.message = `Error with ${appName}: ${message}`;
  }

  if (result.request?.url) {
    result.request.url = cleanseUrl(result.request.url);
  }

  return result;
};
