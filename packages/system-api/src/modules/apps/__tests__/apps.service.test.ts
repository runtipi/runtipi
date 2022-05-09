import AppsService from '../apps.service';

describe('Install app', () => {
  it('Should throw when app is not available', () => {
    expect(AppsService.installApp('not-available', {})).rejects.toThrow('App not-available not available');
  });
});
