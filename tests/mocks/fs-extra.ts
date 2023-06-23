import path from 'path';

let mockFiles = Object.create(null);
export const fsExtraMock = {
  default: {
    __createMockFiles: (newMockFiles: Record<string, string>) => {
      mockFiles = Object.create(null);

      // Create folder tree
      Object.keys(newMockFiles).forEach((file) => {
        const dir = path.dirname(file);

        if (!mockFiles[dir]) {
          mockFiles[dir] = [];
        }

        mockFiles[dir].push(path.basename(file));
        mockFiles[file] = newMockFiles[file];
      });
    },
    existsSync: (p: string) => mockFiles[p] !== undefined,
    promises: {
      unlink: async (p: string) => {
        if (mockFiles[p] instanceof Array) {
          mockFiles[p].forEach((file: string) => {
            delete mockFiles[path.join(p, file)];
          });
        }
        delete mockFiles[p];
      },
    },
  },
};
