import { updateV040 } from './v040';
import { updateV050 } from './v050';

export const runUpdates = async (): Promise<void> => {
  // v040: Update to 0.4.0
  await updateV040();
  await updateV050();
};
