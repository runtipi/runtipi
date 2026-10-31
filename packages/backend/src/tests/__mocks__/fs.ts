import type { CopyOptions, MakeDirectoryOptions } from 'node:fs';
import path from 'node:path';
import { fs, vol } from 'memfs';

const copyFolderRecursiveSync = (src: string, dest: string, options: CopyOptions = {}) => {
  const stats = vol.lstatSync(src);

  if (stats.isSymbolicLink() && !options.dereference) {
    const target = vol.readlinkSync(src).toString();
    const copiedTarget = options.verbatimSymlinks ? target : path.resolve(path.dirname(src), target);
    vol.symlinkSync(copiedTarget, dest);
    return;
  }

  const isDirectory = vol.statSync(src).isDirectory();
  if (isDirectory) {
    vol.mkdirSync(dest, { recursive: true });

    for (const childItemName of vol.readdirSync(src)) {
      copyFolderRecursiveSync(`${src}/${childItemName}`, `${dest}/${childItemName}`, options);
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
    mkdirSync: (path: string, options: MakeDirectoryOptions) => {
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
    __printVol: () => {
      // oxlint-disable-next-line no-console -- needed for debugging
      console.log(vol.toTree());
    },
    tree: () => {
      return vol.toTree();
    },
  },
};

export type FsMock = typeof fsMock.default;
