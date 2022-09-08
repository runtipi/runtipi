import childProcess from 'child_process';
import config from '../../../config';
import { getAbsolutePath, readJsonFile, readFile, readdirSync, fileExists, writeFile, createFolder, deleteFolder, runScript, getSeed, ensureAppFolder } from '../fs.helpers';
import fs from 'fs-extra';

jest.mock('fs-extra');

beforeEach(() => {
  // @ts-ignore
  fs.__resetAllMocks();
});

describe('Test: getAbsolutePath', () => {
  it('should return the absolute path', () => {
    expect(getAbsolutePath('/test')).toBe(`${config.ROOT_FOLDER}/test`);
  });
});

describe('Test: readJsonFile', () => {
  it('should return the json file', () => {
    // Arrange
    const rawFile = '{"test": "test"}';
    const mockFiles = {
      [`${config.ROOT_FOLDER}/test-file.json`]: rawFile,
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
      [`${config.ROOT_FOLDER}/test-file.txt`]: rawFile,
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
      [`${config.ROOT_FOLDER}/test/test-file.txt`]: 'test',
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
      [`${config.ROOT_FOLDER}/test-file.txt`]: 'test',
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

    expect(spy).toHaveBeenCalledWith(`${config.ROOT_FOLDER}/test-file.txt`, 'test');
  });
});

describe('Test: createFolder', () => {
  it('should create the folder', () => {
    const spy = jest.spyOn(fs, 'mkdirSync');

    createFolder('/test');

    expect(spy).toHaveBeenCalledWith(`${config.ROOT_FOLDER}/test`);
  });
});

describe('Test: deleteFolder', () => {
  it('should delete the folder', () => {
    const spy = jest.spyOn(fs, 'rmSync');

    deleteFolder('/test');

    expect(spy).toHaveBeenCalledWith(`${config.ROOT_FOLDER}/test`, { recursive: true });
  });
});

describe('Test: runScript', () => {
  it('should run the script', () => {
    const spy = jest.spyOn(childProcess, 'execFile');
    const callback = jest.fn();

    runScript('/test', [], callback);

    expect(spy).toHaveBeenCalledWith(`${config.ROOT_FOLDER}/test`, [], {}, callback);
  });
});

describe('Test: getSeed', () => {
  it('should return the seed', () => {
    const mockFiles = {
      [`${config.ROOT_FOLDER}/state/seed`]: 'test',
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    expect(getSeed()).toEqual('test');
  });
});

describe('Test: ensureAppFolder', () => {
  beforeEach(() => {
    const mockFiles = {
      [`${config.ROOT_FOLDER}/repos/${config.APPS_REPO_ID}/apps/test`]: ['test.yml'],
    };
    // @ts-ignore
    fs.__createMockFiles(mockFiles);
  });

  it('should copy the folder from repo', () => {
    // Act
    ensureAppFolder('test');

    // Assert
    const files = fs.readdirSync(`${config.ROOT_FOLDER}/apps/test`);
    expect(files).toEqual(['test.yml']);
  });

  it('should not copy the folder if it already exists', () => {
    const mockFiles = {
      [`${config.ROOT_FOLDER}/repos/${config.APPS_REPO_ID}/apps/test`]: ['test.yml'],
      [`${config.ROOT_FOLDER}/apps/test`]: ['docker-compose.yml'],
      [`${config.ROOT_FOLDER}/apps/test/docker-compose.yml`]: 'test',
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    // Act
    ensureAppFolder('test');

    // Assert
    const files = fs.readdirSync(`${config.ROOT_FOLDER}/apps/test`);
    expect(files).toEqual(['docker-compose.yml']);
  });

  it('Should overwrite the folder if clean up is true', () => {
    const mockFiles = {
      [`${config.ROOT_FOLDER}/repos/${config.APPS_REPO_ID}/apps/test`]: ['test.yml'],
      [`${config.ROOT_FOLDER}/apps/test`]: ['docker-compose.yml'],
      [`${config.ROOT_FOLDER}/apps/test/docker-compose.yml`]: 'test',
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    // Act
    ensureAppFolder('test', true);

    // Assert
    const files = fs.readdirSync(`${config.ROOT_FOLDER}/apps/test`);
    expect(files).toEqual(['test.yml']);
  });
});
