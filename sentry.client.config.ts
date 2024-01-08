import { cleanseErrorData } from '@runtipi/shared/src/helpers/error-helpers';
import * as Sentry from '@sentry/nextjs';
import { settingsSchema } from '@runtipi/shared/src/schemas/env-schemas';

const inputElement = document.getElementById('client-settings') as HTMLInputElement | null;

if (inputElement) {
  try {
    // Parse the input value
    const parsedSettings = settingsSchema.parse(JSON.parse(inputElement.value));

    if (parsedSettings.allowErrorMonitoring && process.env.NODE_ENV === 'production') {
      Sentry.init({
        environment: process.env.NODE_ENV,
        dsn: 'https://7a73d72f886948478b55621e7b92c3c7@o4504242900238336.ingest.sentry.io/4504826587971584',
        enableTracing: false,
        beforeSend: cleanseErrorData,
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error parsing client settings:', error);
  }
}
