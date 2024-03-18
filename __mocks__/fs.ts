import { fs, vol } from 'memfs';

const copyFolderRecursiveSync = (src: string, dest: string) => {
  const exists = vol.existsSync(src);
  const stats = vol.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    vol.mkdirSync(dest, { recursive: true });
    vol.readdirSync(src).forEach((childItemName) => {
      copyFolderRecursiveSync(`${src}/${childItemName}`, `${dest}/${childItemName}`);
    });
  } else {
    vol.copyFileSync(src, dest);
  }
};

export default {
  ...fs,
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
};
