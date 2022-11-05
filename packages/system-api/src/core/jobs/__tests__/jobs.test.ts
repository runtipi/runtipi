import cron from 'node-cron';
import { getConfig } from '../../config/TipiConfig';
import startJobs from '../jobs';
import { eventDispatcher, EventTypes } from '../../config/EventDispatcher';

jest.mock('node-cron');
jest.mock('child_process');

beforeEach(async () => {
  jest.resetModules();
  jest.resetAllMocks();
});

describe('Test: startJobs', () => {
  it('Should start cron jobs', () => {
    const spy = jest.spyOn(cron, 'schedule');

    startJobs();
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('*/30 * * * *', expect.any(Function));
    spy.mockRestore();
  });

  it('Should update apps repo on cron trigger', () => {
    const spy = jest.spyOn(eventDispatcher, 'dispatchEvent');

    // Act
    startJobs();

    // Assert
    expect(spy.mock.calls.length).toBe(2);
    expect(spy.mock.calls[0]).toEqual([EventTypes.UPDATE_REPO, [getConfig().appsRepoUrl]]);
    expect(spy.mock.calls[1]).toEqual([EventTypes.SYSTEM_INFO, []]);

    spy.mockRestore();
  });
});
