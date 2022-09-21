import childProcess from 'child_process';
import { getAbsolutePath, readJsonFile, readFile, readdirSync, fileExists, writeFile, createFolder, deleteFolder, runScript, getSeed, ensureAppFolder } from '../fs.helpers';
import fs from 'fs-extra';
import { getConfig } from '../../../core/config/TipiConfig';

jest.mock('fs-extra');

beforeEach(() => {
  // @ts-ignore
  fs.__resetAllMocks();
});

describe('Test: getAbsolutePath', () => {
  it('should return the absolute path', () => {
    expect(getAbsolutePath('/test')).toBe(`${getConfig().rootFolder}/test`);
  });
});

describe('Test: readJsonFile', () => {
  it('should return the json file', () => {
    // Arrange
    const rawFile = '{"test": "test"}';
    const mockFiles = {
      [`${getConfig().rootFolder}/test-file.json`]: rawFile,
    };
    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    // Act
    const file = readJsonFile('/test-file.json');

    // Assert
    expect(file).toEqual({ test: 'test' });
  });

  it('should return null if the file does not exist', () => {
    expect(readJsonFile('/test')).toBeNull();
  });
});

describe('Test: readFile', () => {
  it('should return the file', () => {
    const rawFile = 'test';
    const mockFiles = {
      [`${getConfig().rootFolder}/test-file.txt`]: rawFile,
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    expect(readFile('/test-file.txt')).toEqual('test');
  });

  it('should return empty string if the file does not exist', () => {
    expect(readFile('/test')).toEqual('');
  });
});

describe('Test: readdirSync', () => {
  it('should return the files', () => {
    const mockFiles = {
      [`${getConfig().rootFolder}/test/test-file.txt`]: 'test',
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    expect(readdirSync('/test')).toEqual(['test-file.txt']);
  });

  it('should return empty array if the directory does not exist', () => {
    expect(readdirSync('/test')).toEqual([]);
  });
});

describe('Test: fileExists', () => {
  it('should return true if the file exists', () => {
    const mockFiles = {
      [`${getConfig().rootFolder}/test-file.txt`]: 'test',
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    expect(fileExists('/test-file.txt')).toBeTruthy();
  });

  it('should return false if the file does not exist', () => {
    expect(fileExists('/test-file.txt')).toBeFalsy();
  });
});

describe('Test: writeFile', () => {
  it('should write the file', () => {
    const spy = jest.spyOn(fs, 'writeFileSync');

    writeFile('/test-file.txt', 'test');

    expect(spy).toHaveBeenCalledWith(`${getConfig().rootFolder}/test-file.txt`, 'test');
  });
});

describe('Test: createFolder', () => {
  it('should create the folder', () => {
    const spy = jest.spyOn(fs, 'mkdirSync');

    createFolder('/test');

    expect(spy).toHaveBeenCalledWith(`${getConfig().rootFolder}/test`);
  });
});

describe('Test: deleteFolder', () => {
  it('should delete the folder', () => {
    const spy = jest.spyOn(fs, 'rmSync');

    deleteFolder('/test');

    expect(spy).toHaveBeenCalledWith(`${getConfig().rootFolder}/test`, { recursive: true });
  });
});

describe('Test: runScript', () => {
  it('should run the script', () => {
    const spy = jest.spyOn(childProcess, 'execFile');
    const callback = jest.fn();

    runScript('/test', [], callback);

    expect(spy).toHaveBeenCalledWith(`${getConfig().rootFolder}/test`, [], {}, callback);
  });
});

describe('Test: getSeed', () => {
  it('should return the seed', () => {
    const mockFiles = {
      [`${getConfig().rootFolder}/state/seed`]: 'test',
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    expect(getSeed()).toEqual('test');
  });
});

describe('Test: ensureAppFolder', () => {
  beforeEach(() => {
    const mockFiles = {
      [`${getConfig().rootFolder}/repos/${getConfig().appsRepoId}/apps/test`]: ['test.yml'],
    };
    // @ts-ignore
    fs.__createMockFiles(mockFiles);
  });

  it('should copy the folder from repo', () => {
    // Act
    ensureAppFolder('test');

    // Assert
    const files = fs.readdirSync(`${getConfig().rootFolder}/apps/test`);
    expect(files).toEqual(['test.yml']);
  });

  it('should not copy the folder if it already exists', () => {
    const mockFiles = {
      [`${getConfig().rootFolder}/repos/${getConfig().appsRepoId}/apps/test`]: ['test.yml'],
      [`${getConfig().rootFolder}/apps/test`]: ['docker-compose.yml'],
      [`${getConfig().rootFolder}/apps/test/docker-compose.yml`]: 'test',
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    // Act
    ensureAppFolder('test');

    // Assert
    const files = fs.readdirSync(`${getConfig().rootFolder}/apps/test`);
    expect(files).toEqual(['docker-compose.yml']);
  });

  it('Should overwrite the folder if clean up is true', () => {
    const mockFiles = {
      [`${getConfig().rootFolder}/repos/${getConfig().appsRepoId}/apps/test`]: ['test.yml'],
      [`${getConfig().rootFolder}/apps/test`]: ['docker-compose.yml'],
      [`${getConfig().rootFolder}/apps/test/docker-compose.yml`]: 'test',
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    // Act
    ensureAppFolder('test', true);

    // Assert
    const files = fs.readdirSync(`${getConfig().rootFolder}/apps/test`);
    expect(files).toEqual(['test.yml']);
  });
});
