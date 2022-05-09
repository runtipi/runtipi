import path from 'path';
const fs: {
  __createMockFiles: typeof createMockFiles;
  readFileSync: typeof readFileSync;
  existsSync: typeof existsSync;
  writeFileSync: typeof writeFileSync;
  mkdirSync: typeof mkdirSync;
  rmSync: typeof rmSync;
  readdirSync: typeof readdirSync;
  copyFileSync: typeof copyFileSync;
} = jest.genMockFromModule('fs');

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

const rmSync = (p: string, options: { recursive: boolean }) => {
  if (options.recursive) {
    delete mockFiles[p];
  } else {
    delete mockFiles[p][Object.keys(mockFiles[p])[0]];
  }
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

fs.readdirSync = readdirSync;
fs.existsSync = existsSync;
fs.readFileSync = readFileSync;
fs.writeFileSync = writeFileSync;
fs.mkdirSync = mkdirSync;
fs.rmSync = rmSync;
fs.copyFileSync = copyFileSync;
fs.__createMockFiles = createMockFiles;

module.exports = fs;
