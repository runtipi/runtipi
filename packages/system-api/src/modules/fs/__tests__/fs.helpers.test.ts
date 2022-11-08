import fs from 'fs-extra';
import { readJsonFile, readFile, readdirSync, fileExists, writeFile, createFolder, deleteFolder, getSeed } from '../fs.helpers';

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
      '/runtipi/test-file.json': rawFile,
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
      '/runtipi/test-file.txt': rawFile,
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
      '/runtipi/test/test-file.txt': 'test',
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
      '/runtipi/test-file.txt': 'test',
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

describe('Test: getSeed', () => {
  it('should return the seed', () => {
    const mockFiles = {
      '/runtipi/state/seed': 'test',
    };

    // @ts-ignore
    fs.__createMockFiles(mockFiles);

    expect(getSeed()).toEqual('test');
  });
});
