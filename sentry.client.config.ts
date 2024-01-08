import * as Sentry from '@sentry/nextjs';
import { settingsSchema } from '@runtipi/shared/src/schemas/env-schemas';
import { cleanseErrorData } from '@runtipi/shared/src/helpers/error-helpers';

const getClientConfig = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  const inputElement = document.getElementById('client-settings') as HTMLInputElement | null;

  if (!inputElement) {
    return {};
  }

  const parsedSettings = settingsSchema.parse(JSON.parse(inputElement.value));

  return parsedSettings;
};

if (getClientConfig().allowErrorMonitoring) {
  Sentry.init({
    environment: process.env.NODE_ENV,
    dsn: 'https://7a73d72f886948478b55621e7b92c3c7@o4504242900238336.ingest.sentry.io/4504826587971584',
    beforeSend: cleanseErrorData,
  });
}
