import { promises } from 'fs';
import path from 'path';
import { z } from 'zod';
import { settingsSchema } from '@runtipi/shared';

export const setSettings = async (settings: z.infer<typeof settingsSchema>) => {
  // Create state folder if it doesn't exist
  await promises.mkdir(path.join(__dirname, '../../state'), { recursive: true });

  await promises.writeFile(path.join(__dirname, '../../state/settings.json'), JSON.stringify(settings));
};
