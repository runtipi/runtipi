import cron from 'node-cron';
import * as repoHelpers from '../../../helpers/repo-helpers';
import { getConfig } from '../../config/TipiConfig';
import startJobs from '../jobs';

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
    expect(spy).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
    spy.mockRestore();
  });

  it('Should update apps repo on cron trigger', () => {
    const spy = jest.spyOn(repoHelpers, 'updateRepo');

    startJobs();

    expect(spy).toHaveBeenCalledWith(getConfig().appsRepoUrl);
    spy.mockRestore();
  });
});
