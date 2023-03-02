export const createClient = jest.fn(() => {
  const values = new Map();
  const expirations = new Map();
  return {
    isOpen: true,
    connect: jest.fn(),
    set: (key: string, value: string, exp: number) => {
      values.set(key, value);
      expirations.set(key, exp);
    },
    get: (key: string) => values.get(key),
    quit: jest.fn(),
    del: (key: string) => values.delete(key),
    ttl: (key: string) => expirations.get(key),
  };
});
