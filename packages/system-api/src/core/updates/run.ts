import { updateV040 } from './v040';

export const runUpdates = async (): Promise<void> => {
  // v040: Update to 0.4.0
  await updateV040();
};
