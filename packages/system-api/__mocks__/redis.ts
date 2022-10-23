module.exports = {
  createClient: jest.fn(() => {
    const values = new Map();
    return {
      isOpen: true,
      connect: jest.fn(),
      set: (key: string, value: string) => {
        values.set(key, value);
      },
      get: (key: string) => {
        return values.get(key);
      },
      quit: jest.fn(),
      del: (key: string) => {
        return values.delete(key);
      },
    };
  }),
};
