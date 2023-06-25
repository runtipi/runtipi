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
    __applyMockFiles: (newMockFiles: Record<string, string>) => {
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
    copySync: (source: string, destination: string) => {
      mockFiles[destination] = mockFiles[source];

      if (mockFiles[source] instanceof Array) {
        mockFiles[source].forEach((file: string) => {
          mockFiles[`${destination}/${file}`] = mockFiles[`${source}/${file}`];
        });
      }
    },
    existsSync: (p: string) => mockFiles[p] !== undefined,
    readdirSync: (p: string) => {
      const files: string[] = [];

      const depth = p.split('/').length;

      Object.keys(mockFiles).forEach((file) => {
        if (file.startsWith(p)) {
          const fileDepth = file.split('/').length;

          if (fileDepth === depth + 1) {
            files.push(file.split('/').pop() || '');
          }
        }
      });

      return files;
    },

    rmSync: (p: string) => {
      if (mockFiles[p] instanceof Array) {
        mockFiles[p].forEach((file: string) => {
          delete mockFiles[path.join(p, file)];
        });
      }

      delete mockFiles[p];
    },
    writeFileSync: (p: string, data: string | string[]) => {
      mockFiles[p] = data;
    },
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
