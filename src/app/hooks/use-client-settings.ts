import { settingsSchema } from '@runtipi/shared';
import { useState, useEffect } from 'react';
import { z } from 'zod';

// A react hook to grab the content of hidden input "client-settings", JSON.parse it and return the value
export const useClientSettings = () => {
  const [settings, setSettings] = useState<z.infer<typeof settingsSchema>>({});

  useEffect(() => {
    // Get the hidden input element
    const inputElement = document.getElementById('client-settings') as HTMLInputElement | null;
    if (inputElement) {
      try {
        // Parse the input value
        const parsedSettings = settingsSchema.parse(JSON.parse(inputElement.value));
        setSettings(parsedSettings);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error parsing client settings:', error);
      }
    }
  }, []);

  return settings;
};
