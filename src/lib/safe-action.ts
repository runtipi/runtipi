import { createSafeActionClient } from 'next-safe-action';

export const action = createSafeActionClient({
  handleReturnedServerError: (e) => {
    // eslint-disable-next-line no-console
    console.error('Error from server', e.message);

    return e.message || 'An unexpected error occurred';
  },
});
