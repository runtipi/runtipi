import { generateVapidKeys, getAppEnvMap } from '../env.helpers';
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { APP_DATA_DIR } from '@/config/constants';

describe('getAppEnvMap', () => {
  it('should ignore lines starting with #', async () => {
    // arrange
    const appId = 'test-app';
    const envContent = '# This is a comment\nKEY=value';
    const envFilePath = path.join(APP_DATA_DIR, appId, 'app.env');
    await fs.promises.mkdir(path.dirname(envFilePath), { recursive: true });
    await fs.promises.writeFile(envFilePath, envContent);

    // act
    const envMap = await getAppEnvMap(appId);

    // assert
    expect(envMap.has('# This is a comment')).toBe(false);
    expect(envMap.get('KEY')).toBe('value');
  });

  it('should correctly parse values with multiple "=" characters', async () => {
    // arrange
    const appId = 'test-app';
    const envContent = 'KEY=value=with=equals';
    const envFilePath = path.join(APP_DATA_DIR, appId, 'app.env');
    await fs.promises.mkdir(path.dirname(envFilePath), { recursive: true });
    await fs.promises.writeFile(envFilePath, envContent);

    // act
    const envMap = await getAppEnvMap(appId);

    // assert
    expect(envMap.get('KEY')).toBe('value=with=equals');
  });

  it('should handle lines with keys but no values', async () => {
    // arrange
    const appId = 'test-app';
    const envContent = 'KEY=';
    const envFilePath = path.join(APP_DATA_DIR, appId, 'app.env');
    await fs.promises.mkdir(path.dirname(envFilePath), { recursive: true });
    await fs.promises.writeFile(envFilePath, envContent);

    // act
    const envMap = await getAppEnvMap(appId);

    // assert
    expect(envMap.get('KEY')).toBe('');
  });

  it('should handle lines without equals signs', async () => {
    // arrange
    const appId = 'test-app';
    const envContent = 'KEY';
    const envFilePath = path.join(APP_DATA_DIR, appId, 'app.env');
    await fs.promises.mkdir(path.dirname(envFilePath), { recursive: true });
    await fs.promises.writeFile(envFilePath, envContent);

    // act
    const envMap = await getAppEnvMap(appId);

    // assert
    expect(envMap.get('KEY')).toBe(undefined);
  });
});

describe('generateVapidKeys', () => {
  it('should generate valid VAPID keys', () => {
    // act
    const keys = generateVapidKeys();

    // assert
    expect(keys).toHaveProperty('publicKey');
    expect(keys).toHaveProperty('privateKey');
    expect(typeof keys.publicKey).toBe('string');
    expect(typeof keys.privateKey).toBe('string');
    expect(keys.publicKey).not.toBe('');
    expect(keys.privateKey).not.toBe('');
  });
});
