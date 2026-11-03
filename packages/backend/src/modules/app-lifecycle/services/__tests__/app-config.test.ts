import { fromPartial } from '@total-typescript/shoehorn';
import type { AppInfo } from '@runtipi/common/schemas';
import { describe, expect, it } from 'vitest';
import { getAppConfigUpdate } from '../app-config';

const settings = {
  port: 8080,
  openPort: true,
  skipEnv: false,
  skipPull: false,
  skipRun: false,
};

const appInfo = fromPartial<AppInfo>({
  port: 8080,
  form_fields: [{ env_variable: 'KEEP_ME' }, { env_variable: 'ALSO_KEEP' }],
});

describe('getAppConfigUpdate', () => {
  it('keeps Runtipi settings and the fields the app still declares', () => {
    const update = getAppConfigUpdate(appInfo, {
      ...settings,
      exposed: true,
      KEEP_ME: 'a',
      ALSO_KEEP: 'b',
    });

    expect(update.config).toMatchObject({ ...settings, exposed: true, KEEP_ME: 'a', ALSO_KEEP: 'b' });
  });

  it('drops values of fields the app no longer declares', () => {
    const update = getAppConfigUpdate(appInfo, {
      ...settings,
      KEEP_ME: 'a',
      REMOVED_PASSWORD: 'hunter2',
    });

    expect(update.config).toMatchObject({ ...settings, KEEP_ME: 'a' });
    expect('REMOVED_PASSWORD' in update.config).toBe(false);
  });
});
