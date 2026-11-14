import { appInfoSchema } from '@runtipi/common/schemas';
import { expect, test, vi } from 'vitest';
import { createAppInStore } from '../create-app-in-store';

test('creates valid app metadata when it is read in the same millisecond', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);

  try {
    const appInfo = await createAppInStore('test', { id: 'same-millisecond' });

    expect(() => appInfoSchema.assert(appInfo)).not.toThrow();
  } finally {
    clock.mockRestore();
  }
});
