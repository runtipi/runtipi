import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '@/common/constants';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateSystemEnvFile } from '../env-helpers';

const envFile = path.join(DATA_DIR, '.env');
const settingsFile = path.join(DATA_DIR, 'state', 'settings.json');

describe('generateSystemEnvFile theme defaults', () => {
  const rootFolderHost = process.env.ROOT_FOLDER_HOST;

  beforeEach(async () => {
    process.env.ROOT_FOLDER_HOST = '/runtipi';
    await fs.promises.mkdir(path.join(DATA_DIR, 'state'), { recursive: true });
  });

  afterEach(() => {
    process.env.ROOT_FOLDER_HOST = rootFolderHost;
  });

  const generate = async (env: string, settings: Record<string, unknown>) => {
    await fs.promises.writeFile(envFile, env);
    await fs.promises.writeFile(settingsFile, JSON.stringify(settings));
    const envMap = await generateSystemEnvFile();
    return { base: envMap.get('THEME_BASE'), color: envMap.get('THEME_COLOR') };
  };

  it('uses the default theme on new installs', async () => {
    expect(await generate('', {})).toEqual({ base: 'stone', color: 'orange' });
  });

  it('replaces the previous defaults that were written without a user choice', async () => {
    expect(await generate('THEME_BASE=gray\nTHEME_COLOR=blue\n', {})).toEqual({ base: 'stone', color: 'orange' });
  });

  it('keeps themes chosen in the settings', async () => {
    expect(await generate('THEME_BASE=gray\nTHEME_COLOR=blue\n', { themeBase: 'gray', themeColor: 'blue' })).toEqual({ base: 'gray', color: 'blue' });
  });

  it('keeps other themes set in the env file', async () => {
    expect(await generate('THEME_BASE=zinc\nTHEME_COLOR=pink\n', {})).toEqual({ base: 'zinc', color: 'pink' });
  });
});
