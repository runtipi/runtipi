import { fs, vol } from 'memfs';
import type { IMkdirOptions } from 'memfs/lib/node/types/options';

const copyFolderRecursiveSync = (src: string, dest: string) => {
  const exists = vol.existsSync(src);
  const stats = vol.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    vol.mkdirSync(dest, { recursive: true });

    for (const childItemName of vol.readdirSync(src)) {
      copyFolderRecursiveSync(`${src}/${childItemName}`, `${dest}/${childItemName}`);
    }
  } else {
    vol.copyFileSync(src, dest);
  }
};

export const fsMock = {
  default: {
    ...fs,
    readFileSync: (path: string, format: string) => {
      return vol.readFileSync(path, format);
    },
    writeFileSync: (path: string, data: string) => {
      vol.writeFileSync(path, data);
    },
    mkdirSync: (path: string, options: IMkdirOptions) => {
      vol.mkdirSync(path, options);
    },
    promises: {
      ...fs.promises,
      cp: copyFolderRecursiveSync,
    },
    copySync: (src: string, dest: string) => {
      copyFolderRecursiveSync(src, dest);
    },
    __resetAllMocks: () => {
      vol.reset();
    },
    __applyMockFiles: (newMockFiles: Record<string, string>) => {
      // Create folder tree
      vol.fromJSON(newMockFiles, 'utf8');
    },
    __createMockFiles: (newMockFiles: Record<string, string>) => {
      vol.reset();
      // Create folder tree
      vol.fromJSON(newMockFiles, 'utf8');
    },
    __printVol: () => console.log(vol.toTree()),
  },
};
