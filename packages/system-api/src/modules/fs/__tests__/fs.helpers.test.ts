import childProcess from 'child_process';
import { readJsonFile, readFile, readdirSync, fileExists, writeFile, createFolder, deleteFolder, runScript, getSeed, ensureAppFolder } from '../fs.helpers';
import fs from 'fs-extra';
import { getConfig } from '../../../core/config/TipiConfig';
import { faker } from '@faker-js/faker';

jest.mock('fs-extra');

beforeEach(() => {
  // @ts-ignore
  fs.__resetAllMocks();
});

describe('Test: readJsonFile', () => {
  it('should return the json file', () => {
    // Arrange
    const rawFile = '{"test": "test"}';
    const mockFiles = {
      ['/runtipi/test-file.json']: rawFile,
    };
    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    // Act
    const file = readJsonFile('/runtipi/test-file.json');

    // Assert
    expect(file).toEqual({ test: 'test' });
  });

  it('should return null if the file does not exist', () => {
    expect(readJsonFile('/test')).toBeNull();
  });

  it('Should return null if fs.readFile throws an error', () => {
    // Arrange
    // @ts-ignore
    const spy = jest.spyOn(fs, 'readFileSync');
    spy.mockImplementation(() => {
      throw new Error('Error');
    });

    // Act
    const file = readJsonFile('/test');

    // Assert
    expect(file).toBeNull();
    spy.mockRestore();
  });
});

describe('Test: readFile', () => {
  it('should return the file', () => {
    const rawFile = 'test';
    const mockFiles = {
      ['/runtipi/test-file.txt']: rawFile,
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    expect(readFile('/runtipi/test-file.txt')).toEqual('test');
  });

  it('should return empty string if the file does not exist', () => {
    expect(readFile('/test')).toEqual('');
  });
});

describe('Test: readdirSync', () => {
  it('should return the files', () => {
    const mockFiles = {
      ['/runtipi/test/test-file.txt']: 'test',
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    expect(readdirSync('/runtipi/test')).toEqual(['test-file.txt']);
  });

  it('should return empty array if the directory does not exist', () => {
    expect(readdirSync('/test')).toEqual([]);
  });
});

describe('Test: fileExists', () => {
  it('should return true if the file exists', () => {
    const mockFiles = {
      ['/runtipi/test-file.txt']: 'test',
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    expect(fileExists('/runtipi/test-file.txt')).toBeTruthy();
  });

  it('should return false if the file does not exist', () => {
    expect(fileExists('/test-file.txt')).toBeFalsy();
  });
});

describe('Test: writeFile', () => {
  it('should write the file', () => {
    const spy = jest.spyOn(fs, 'writeFileSync');

    writeFile('/runtipi/test-file.txt', 'test');

    expect(spy).toHaveBeenCalledWith('/runtipi/test-file.txt', 'test');
  });
});

describe('Test: createFolder', () => {
  it('should create the folder', () => {
    const spy = jest.spyOn(fs, 'mkdirSync');

    createFolder('/test');

    expect(spy).toHaveBeenCalledWith('/test', { recursive: true });
  });
});

describe('Test: deleteFolder', () => {
  it('should delete the folder', () => {
    const spy = jest.spyOn(fs, 'rmSync');

    deleteFolder('/test');

    expect(spy).toHaveBeenCalledWith('/test', { recursive: true });
  });
});

describe('Test: runScript', () => {
  it('should run the script', () => {
    const spy = jest.spyOn(childProcess, 'execFile');
    const callback = jest.fn();

    runScript('/test', [], callback);

    expect(spy).toHaveBeenCalledWith('/test', [], {}, callback);
  });
});

describe('Test: getSeed', () => {
  it('should return the seed', () => {
    const mockFiles = {
      ['/runtipi/state/seed']: 'test',
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    expect(getSeed()).toEqual('test');
  });
});

describe('Test: ensureAppFolder', () => {
  beforeEach(() => {
    const mockFiles = {
      [`/runtipi/repos/${getConfig().appsRepoId}/apps/test`]: ['test.yml'],
    };
    // @ts-ignore
    fs.__createMockFiles(mockFiles);
  });

  it('should copy the folder from repo', () => {
    // Act
    ensureAppFolder('test');

    // Assert
    const files = fs.readdirSync('/app/storage/apps/test');
    expect(files).toEqual(['test.yml']);
  });

  it('should not copy the folder if it already exists', () => {
    const mockFiles = {
      [`/runtipi/repos/${getConfig().appsRepoId}/apps/test`]: ['test.yml'],
      ['/app/storage/apps/test']: ['docker-compose.yml'],
      ['/app/storage/apps/test/docker-compose.yml']: 'test',
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    // Act
    ensureAppFolder('test');

    // Assert
    const files = fs.readdirSync('/app/storage/apps/test');
    expect(files).toEqual(['docker-compose.yml']);
  });

  it('Should overwrite the folder if clean up is true', () => {
    const mockFiles = {
      [`/runtipi/repos/${getConfig().appsRepoId}/apps/test`]: ['test.yml'],
      ['/app/storage/apps/test']: ['docker-compose.yml'],
      ['/app/storage/apps/test/docker-compose.yml']: 'test',
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    // Act
    ensureAppFolder('test', true);

    // Assert
    const files = fs.readdirSync('/app/storage/apps/test');
    expect(files).toEqual(['test.yml']);
  });

  it('Should delete folder if it exists but has no docker-compose.yml file', () => {
    // Arrange
    const randomFileName = `${faker.random.word()}.yml`;
    const mockFiles = {
      [`/runtipi/repos/${getConfig().appsRepoId}/apps/test`]: [randomFileName],
      ['/app/storage/apps/test']: ['test.yml'],
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    // Act
    ensureAppFolder('test');

    // Assert
    const files = fs.readdirSync('/app/storage/apps/test');
    expect(files).toEqual([randomFileName]);
  });
});
