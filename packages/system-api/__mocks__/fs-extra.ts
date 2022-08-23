import path from 'path';
const fs: {
  __createMockFiles: typeof createMockFiles;
  __resetAllMocks: typeof resetAllMocks;
  readFileSync: typeof readFileSync;
  existsSync: typeof existsSync;
  writeFileSync: typeof writeFileSync;
  mkdirSync: typeof mkdirSync;
  rmSync: typeof rmSync;
  readdirSync: typeof readdirSync;
  copyFileSync: typeof copyFileSync;
  copySync: typeof copyFileSync;
  createFileSync: typeof createFileSync;
} = jest.genMockFromModule('fs-extra');

let mockFiles = Object.create(null);

const createMockFiles = (newMockFiles: Record<string, string>) => {
  mockFiles = Object.create(null);

  // Create folder tree
  for (const file in newMockFiles) {
    const dir = path.dirname(file);

    if (!mockFiles[dir]) {
      mockFiles[dir] = [];
    }

    mockFiles[dir].push(path.basename(file));
    mockFiles[file] = newMockFiles[file];
  }
};

const readFileSync = (p: string) => {
  return mockFiles[p];
};

const existsSync = (p: string) => {
  return mockFiles[p] !== undefined;
};

const writeFileSync = (p: string, data: any) => {
  mockFiles[p] = data;
};

const mkdirSync = (p: string) => {
  mockFiles[p] = Object.create(null);
};

const rmSync = (p: string) => {
  if (mockFiles[p] instanceof Array) {
    mockFiles[p].forEach((file: string) => {
      delete mockFiles[path.join(p, file)];
    });
  }

  delete mockFiles[p];
};

const readdirSync = (p: string) => {
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
};

const copyFileSync = (source: string, destination: string) => {
  mockFiles[destination] = mockFiles[source];
};

const copySync = (source: string, destination: string) => {
  mockFiles[destination] = mockFiles[source];

  if (mockFiles[source] instanceof Array) {
    mockFiles[source].forEach((file: string) => {
      mockFiles[destination + '/' + file] = mockFiles[source + '/' + file];
    });
  }
};

const createFileSync = (p: string) => {
  mockFiles[p] = '';
};

const resetAllMocks = () => {
  mockFiles = Object.create(null);
};

fs.readdirSync = readdirSync;
fs.existsSync = existsSync;
fs.readFileSync = readFileSync;
fs.writeFileSync = writeFileSync;
fs.mkdirSync = mkdirSync;
fs.rmSync = rmSync;
fs.copyFileSync = copyFileSync;
fs.copySync = copySync;
fs.createFileSync = createFileSync;
fs.__createMockFiles = createMockFiles;
fs.__resetAllMocks = resetAllMocks;

module.exports = fs;
