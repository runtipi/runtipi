import { faker } from '@faker-js/faker';
import childProcess from 'child_process';
import logger from '../../config/logger/logger';
import { getConfig } from '../../core/config/TipiConfig';
import { cloneRepo, updateRepo } from '../repo-helpers';

jest.mock('child_process');

beforeEach(async () => {
  jest.resetModules();
  jest.resetAllMocks();
});

describe('Test: updateRepo', () => {
  it('Should run update script', async () => {
    const log = jest.spyOn(logger, 'info');
    const spy = jest.spyOn(childProcess, 'execFile');
    const url = faker.internet.url();
    const stdout = faker.random.words();

    // @ts-ignore
    spy.mockImplementation((_path, _args, _, cb) => {
      // @ts-ignore
      if (cb) cb(null, stdout, null);
    });

    await updateRepo(url);

    expect(spy).toHaveBeenCalledWith(`${getConfig().rootFolder}/scripts/git.sh`, ['update', url], {}, expect.any(Function));
    expect(log).toHaveBeenCalledWith(`Update result: ${stdout}`);
    spy.mockRestore();
  });

  it('Should throw and log error if script failed', async () => {
    const url = faker.internet.url();

    const log = jest.spyOn(logger, 'error');
    const spy = jest.spyOn(childProcess, 'execFile');

    const randomWord = faker.random.word();

    // @ts-ignore
    spy.mockImplementation((_path, _args, _, cb) => {
      // @ts-ignore
      if (cb) cb(randomWord, null, null);
    });

    try {
      await updateRepo(url);
    } catch (e) {
      expect(e).toBe(randomWord);
      expect(log).toHaveBeenCalledWith(`Error updating repo: ${randomWord}`);
    }
    spy.mockRestore();
  });
});

describe('Test: cloneRepo', () => {
  it('Should run clone script', async () => {
    const log = jest.spyOn(logger, 'info');
    const spy = jest.spyOn(childProcess, 'execFile');
    const url = faker.internet.url();
    const stdout = faker.random.words();

    // @ts-ignore
    spy.mockImplementation((_path, _args, _, cb) => {
      // @ts-ignore
      if (cb) cb(null, stdout, null);
    });

    await cloneRepo(url);

    expect(spy).toHaveBeenCalledWith(`${getConfig().rootFolder}/scripts/git.sh`, ['clone', url], {}, expect.any(Function));
    expect(log).toHaveBeenCalledWith(`Clone result ${stdout}`);
    spy.mockRestore();
  });

  it('Should throw and log error if script failed', async () => {
    const url = faker.internet.url();

    const log = jest.spyOn(logger, 'error');
    const spy = jest.spyOn(childProcess, 'execFile');

    const randomWord = faker.random.word();

    // @ts-ignore
    spy.mockImplementation((_path, _args, _, cb) => {
      // @ts-ignore
      if (cb) cb(randomWord, null, null);
    });

    try {
      await cloneRepo(url);
    } catch (e) {
      expect(e).toBe(randomWord);
      expect(log).toHaveBeenCalledWith(`Error cloning repo: ${randomWord}`);
    }
    spy.mockRestore();
  });
});
