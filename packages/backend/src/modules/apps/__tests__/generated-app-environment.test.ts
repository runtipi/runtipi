import { castAppUrn } from '@/common/helpers/app-helpers';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { EnvUtils } from '@/modules/env/env.utils';
import { fromPartial } from '@total-typescript/shoehorn';
import { expect, test } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { AppFilesManager } from '../app-files-manager';
import { AppHelpers } from '../app.helpers';

const urn = castAppUrn('demo:store');
const setup = (existing = '') => {
  const files = mock<AppFilesManager>();
  files.getInstalledAppInfo.mockResolvedValue(
    fromPartial({ port: 8080, version: '1.0', form_fields: [{ type: 'random', env_variable: 'APP_KEY', label: 'Key', required: false, min: 32 }] }),
  );
  files.getAppEnv.mockResolvedValue({ path: '/app.env', content: `APP_KEY=${existing}` });
  files.writeAppEnv.mockResolvedValue(true);
  files.getAppDataHostPath.mockReturnValue('/app-data/store/demo');

  const config = mock<ConfigurationService>();
  config.getConfig.mockReturnValue(fromPartial({ internalIp: '127.0.0.1', rootFolderHost: '/opt/tipi', envFilePath: '/data/.env' }));

  const filesystem = mock<FilesystemService>();
  filesystem.readTextFile.mockResolvedValue('TZ=UTC');

  const env = new EnvUtils();

  return { files, env, helpers: new AppHelpers(files, config, filesystem, env) };
};

test.each([
  { existing: '', supplied: undefined, expected: expect.stringMatching(/^[a-f0-9]{32}$/) },
  { existing: 'saved-key', supplied: undefined, expected: 'saved-key' },
  { existing: 'saved-key', supplied: '', expected: 'saved-key' },
  { existing: 'saved-key', supplied: 'explicit-key', expected: 'explicit-key' },
])('writes a usable random field: existing=$existing, supplied=$supplied', async ({ existing, supplied, expected }) => {
  const { helpers, files, env } = setup(existing);

  await helpers.generateEnvFile(urn, { APP_KEY: supplied });

  const [writtenUrn, text] = files.writeAppEnv.mock.calls[0]!;
  expect(writtenUrn).toBe(urn);
  expect(env.envStringToMap(text).get('APP_KEY')).toEqual(expected);
});

test('writes the default app domain when the API client omits the port', async () => {
  const { helpers, files, env } = setup();

  await helpers.generateEnvFile(urn, {});

  const text = files.writeAppEnv.mock.calls[0]![1];
  expect(env.envStringToMap(text).get('APP_DOMAIN')).toBe('127.0.0.1:8080');
});

test.each(['random', 'text'] as const)('rejects injected assignments in supplied %s fields before writing', async (type) => {
  const { helpers, files } = setup();
  files.getInstalledAppInfo.mockResolvedValue(
    fromPartial({ port: 8080, form_fields: [{ type, env_variable: 'APP_KEY', label: 'Key', required: false }] }),
  );

  await expect(helpers.generateEnvFile(urn, { APP_KEY: 'value\nAPP_PORT=9000' })).rejects.toThrow('line breaks');
  expect(files.writeAppEnv).not.toHaveBeenCalled();
});

test('rejects injection in metadata defaults before writing', async () => {
  const { helpers, files } = setup();
  files.getInstalledAppInfo.mockResolvedValue(
    fromPartial({
      port: 8080,
      form_fields: [{ type: 'text', env_variable: 'APP_KEY', label: 'Key', required: false, default: 'value\rAPP_PORT=9000' }],
    }),
  );

  await expect(helpers.generateEnvFile(urn, {})).rejects.toThrow('line breaks');
  expect(files.writeAppEnv).not.toHaveBeenCalled();
});
