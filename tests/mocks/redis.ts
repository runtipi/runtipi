import { vi } from 'vitest';

export const redisMock = {
  createClient: vi.fn(() => {
    const values = new Map();
    const expirations = new Map();
    return {
      isOpen: true,
      connect: vi.fn(),
      set: (key: string, value: string, exp: number) => {
        values.set(key, value);
        expirations.set(key, exp);
      },
      get: (key: string) => values.get(key),
      quit: vi.fn(),
      del: (key: string) => values.delete(key),
      ttl: (key: string) => expirations.get(key),
      on: vi.fn(),
      keys: (key: string) => {
        const keyprefix = key.substring(0, key.length - 1);
        const keys = [];
        // eslint-disable-next-line no-restricted-syntax
        for (const [k] of values) {
          if (k.startsWith(keyprefix)) {
            keys.push(k);
          }
        }
        return keys;
      },
    };
  }),
};
