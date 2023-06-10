import path from 'path';

class FsMock {
  private static instance: FsMock;

  private mockFiles = Object.create(null);

  // private constructor() {}

  static getInstance(): FsMock {
    if (!FsMock.instance) {
      FsMock.instance = new FsMock();
    }
    return FsMock.instance;
  }

  __applyMockFiles = (newMockFiles: Record<string, string>) => {
    // Create folder tree
    Object.keys(newMockFiles).forEach((file) => {
      const dir = path.dirname(file);

      if (!this.mockFiles[dir]) {
        this.mockFiles[dir] = [];
      }

      this.mockFiles[dir].push(path.basename(file));
      this.mockFiles[file] = newMockFiles[file];
    });
  };

  __createMockFiles = (newMockFiles: Record<string, string>) => {
    this.mockFiles = Object.create(null);

    // Create folder tree
    Object.keys(newMockFiles).forEach((file) => {
      const dir = path.dirname(file);

      if (!this.mockFiles[dir]) {
        this.mockFiles[dir] = [];
      }

      this.mockFiles[dir].push(path.basename(file));
      this.mockFiles[file] = newMockFiles[file];
    });
  };

  __resetAllMocks = () => {
    this.mockFiles = Object.create(null);
  };

  readFileSync = (p: string) => this.mockFiles[p];

  existsSync = (p: string) => this.mockFiles[p] !== undefined;

  writeFileSync = (p: string, data: string | string[]) => {
    this.mockFiles[p] = data;
  };

  mkdirSync = (p: string) => {
    if (!this.mockFiles[p]) {
      this.mockFiles[p] = [];
    }
  };

  rmSync = (p: string) => {
    if (this.mockFiles[p] instanceof Array) {
      this.mockFiles[p].forEach((file: string) => {
        delete this.mockFiles[path.join(p, file)];
      });
    }

    delete this.mockFiles[p];
  };

  readdirSync = (p: string) => {
    const files: string[] = [];

    const depth = p.split('/').length;

    Object.keys(this.mockFiles).forEach((file) => {
      if (file.startsWith(p)) {
        const fileDepth = file.split('/').length;

        if (fileDepth === depth + 1) {
          files.push(file.split('/').pop() || '');
        }
      }
    });

    return files;
  };

  copyFileSync = (source: string, destination: string) => {
    this.mockFiles[destination] = this.mockFiles[source];
  };

  copySync = (source: string, destination: string) => {
    this.mockFiles[destination] = this.mockFiles[source];

    if (this.mockFiles[source] instanceof Array) {
      this.mockFiles[source].forEach((file: string) => {
        this.mockFiles[`${destination}/${file}`] = this.mockFiles[`${source}/${file}`];
      });
    }
  };

  createFileSync = (p: string) => {
    this.mockFiles[p] = '';
  };

  unlinkSync = (p: string) => {
    if (this.mockFiles[p] instanceof Array) {
      this.mockFiles[p].forEach((file: string) => {
        delete this.mockFiles[path.join(p, file)];
      });
    }
    delete this.mockFiles[p];
  };

  getMockFiles = () => this.mockFiles;

  promises = {
    unlink: async (p: string) => {
      if (this.mockFiles[p] instanceof Array) {
        this.mockFiles[p].forEach((file: string) => {
          delete this.mockFiles[path.join(p, file)];
        });
      }
      delete this.mockFiles[p];
    },
    writeFile: async (p: string, data: string | string[]) => {
      this.mockFiles[p] = data;

      const dir = path.dirname(p);
      if (!this.mockFiles[dir]) {
        this.mockFiles[dir] = [];
      }

      this.mockFiles[dir].push(path.basename(p));
    },
    mkdir: async (p: string) => {
      if (!this.mockFiles[p]) {
        this.mockFiles[p] = [];
      }
    },
    readdir: async (p: string) => {
      const files: string[] = [];

      const depth = p.split('/').length;

      Object.keys(this.mockFiles).forEach((file) => {
        if (file.startsWith(p)) {
          const fileDepth = file.split('/').length;

          if (fileDepth === depth + 1) {
            files.push(file.split('/').pop() || '');
          }
        }
      });

      return files;
    },
    lstat: async (p: string) => {
      return {
        isDirectory: () => {
          return this.mockFiles[p] instanceof Array;
        },
      };
    },
    readFile: async (p: string) => {
      return this.mockFiles[p];
    },
    copyFile: async (source: string, destination: string) => {
      this.mockFiles[destination] = this.mockFiles[source];
    },
  };
}

export default FsMock.getInstance();
