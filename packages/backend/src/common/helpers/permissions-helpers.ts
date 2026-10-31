import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const assertSecretOwner = (filePath: string, stat: fs.Stats) => {
  if (stat.uid !== 0 && stat.uid !== process.geteuid?.()) {
    throw new Error(`${filePath} must be owned by root or the backend user`);
  }
};

const ensurePrivateDirectory = async (directory: string) => {
  const parent = path.dirname(directory);
  const parentStat = await fs.promises.stat(parent);

  if (!parentStat.isDirectory() || (parentStat.mode & 0o022) !== 0) {
    throw new Error(`CLI authentication storage parent ${parent} must be a directory that is not group- or world-writable`);
  }

  await fs.promises.mkdir(directory, { recursive: true, mode: 0o700 });
  const stat = await fs.promises.lstat(directory);

  if (!stat.isDirectory()) {
    throw new Error(`${directory} must be a directory, not a symlink or file`);
  }

  assertSecretOwner(directory, stat);

  await fs.promises.chmod(directory, 0o700);
};

const openPrivateFile = async (filePath: string) => {
  const file = await fs.promises.open(
    filePath,
    fs.constants.O_CREAT | fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK,
    0o600,
  );

  try {
    const stat = await file.stat();

    if (!stat.isFile() || stat.nlink !== 1) {
      throw new Error(`${filePath} must be a regular file with no hard links`);
    }

    assertSecretOwner(filePath, stat);

    return { file, stat };
  } catch (error) {
    await file.close();
    throw error;
  }
};

export const getCliSecret = async (dataDir: string) => {
  await ensurePrivateDirectory(path.join(dataDir, '.secrets'));

  const secretPath = path.join(dataDir, '.secrets', 'cli-secret');
  const { file, stat } = await openPrivateFile(secretPath);

  try {
    let secret = await file.readFile('utf8');

    if (stat.size === 0 || (stat.mode & 0o077) !== 0) {
      secret = crypto.randomBytes(32).toString('hex');
      const replacementPath = `${secretPath}.${crypto.randomUUID()}.tmp`;
      const replacement = await fs.promises.open(replacementPath, 'wx', 0o600);

      try {
        try {
          await replacement.writeFile(secret, 'utf8');
          await replacement.sync();
        } finally {
          await replacement.close();
        }

        await fs.promises.rename(replacementPath, secretPath);
        const directory = await fs.promises.open(path.dirname(secretPath), fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);

        try {
          await directory.sync();
        } finally {
          await directory.close();
        }
      } finally {
        await fs.promises.rm(replacementPath, { force: true });
      }
    }

    if (!/^[a-f0-9]{64}$/.test(secret)) {
      throw new Error(`${secretPath} contains an invalid CLI authentication key`);
    }

    return secret;
  } finally {
    await file.close();
  }
};
