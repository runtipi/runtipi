import cloneDeep from 'lodash.clonedeep';
import type { ErrorEvent, EventHint, Exception } from '@sentry/types';
import validator from 'validator';

const IgnoreErrors = [
  // Innocuous browser errors
  /ResizeObserver loop limit exceeded/,
  /ResizeObserver loop completed with undelivered notifications/,
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
    result.breadcrumbs.forEach((breadcrumb) => {
      if (breadcrumb.data && breadcrumb.data.url) {
        // eslint-disable-next-line no-param-reassign -- mutate in place on a clone
        breadcrumb.data.url = cleanseUrl(breadcrumb.data.url);
      }
    });
  }

  if (result.exception && result.exception.values) {
    result.exception.values.forEach((exception: Exception) => {
      const { stacktrace } = exception;

      if (stacktrace && stacktrace.frames) {
        stacktrace.frames.forEach((frame) => {
          if (frame.filename) {
            // eslint-disable-next-line no-param-reassign -- mutate in place on a clone
            frame.filename = cleanseUrl(frame.filename);
          }
        });
      }
    });
  }

  if (error && error.message && shouldIgnoreException(error.message)) {
    return null;
  }

  if (result.request && result.request.url) {
    result.request.url = cleanseUrl(result.request.url);
  }

  return result;
};
