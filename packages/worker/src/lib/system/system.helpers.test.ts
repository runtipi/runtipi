import fs from 'fs';
import { it, describe, expect, beforeEach } from 'vitest';
import path from 'path';
import { envMapToString } from '@runtipi/shared';
import { faker } from '@faker-js/faker';
import { generateSystemEnvFile } from './system.helpers';
import { DATA_DIR } from '@/config/constants';

const envMap = new Map();

const prepareEnvFile = () => {
  const content = envMapToString(envMap);
  fs.writeFileSync(path.join(DATA_DIR, '.env'), content);
};

beforeEach(() => {
  envMap.clear();
  envMap.set('ROOT_FOLDER_HOST', '/path/to/root');
  envMap.set('INTERNAL_IP', '10.0.0.1');
});

describe('generateSystemEnvFile()', async () => {
  it("should create an empty env file and settigns file if they don't exist", async () => {
    // act
    await generateSystemEnvFile().catch(() => {});

    // assert
    const envFileExists = fs.existsSync(path.join(DATA_DIR, '.env'));
    expect(envFileExists).toBe(true);

    const settingsFileExists = fs.existsSync(path.join(DATA_DIR, 'state', 'settings.json'));
    const settingsFileContent = fs.readFileSync(
      path.join(DATA_DIR, 'state', 'settings.json'),
      'utf8',
    );
    expect(settingsFileExists).toBe(true);
    expect(settingsFileContent).toBe('{}');
  });

  it('should throw an error if ROOT_FOLDER_HOST is not set in the env file', async () => {
    // arrange
    envMap.clear();

    // act
    await generateSystemEnvFile().catch((err) => {
      expect(err.message).toBe('ROOT_FOLDER_HOST not set in .env file');
    });
  });

  it('should throw an error if INTERNAL_IP is not set in the env file', async () => {
    // arrange
    envMap.clear();
    envMap.set('ROOT_FOLDER_HOST', '/path/to/root');
    prepareEnvFile();

    // act
    await generateSystemEnvFile().catch((err) => {
      expect(err.message).toBe('INTERNAL_IP not set in .env file');
    });
  });

  it('should successfully generate the system env file with default values', async () => {
    // arrange
    prepareEnvFile();

    // act
    const generated = await generateSystemEnvFile();

    // assert
    expect(generated.get('APPS_REPO_ID')).toBe(
      '29ca930bfdaffa1dfabf5726336380ede7066bc53297e3c0c868b27c97282903',
    );
    expect(generated.get('APPS_REPO_URL')).toBe('https://github.com/runtipi/runtipi-appstore');
    expect(generated.get('JWT_SECRET')).toBeTruthy();
    expect(generated.get('DOMAIN')).toBe('example.com');
    expect(generated.get('RUNTIPI_APP_DATA_PATH')).toBe(envMap.get('ROOT_FOLDER_HOST'));
    expect(generated.get('POSTGRES_HOST')).toBe('runtipi-db');
    expect(generated.get('POSTGRES_DBNAME')).toBe('tipi');
    expect(generated.get('POSTGRES_USERNAME')).toBe('tipi');
    expect(generated.get('POSTGRES_PORT')).toBe('5432');
    expect(generated.get('REDIS_HOST')).toBe('runtipi-redis');
    expect(generated.get('DEMO_MODE')).toBe('false');
    expect(generated.get('GUEST_DASHBOARD')).toBe('false');
    expect(generated.get('LOCAL_DOMAIN')).toBe('tipi.lan');
    expect(generated.get('ALLOW_AUTO_THEMES')).toBe('true');
    expect(generated.get('ALLOW_ERROR_MONITORING')).toBe('false');
    expect(generated.get('PERSIST_TRAEFIK_CONFIG')).toBe('false');
    expect(generated.get('EVENTS_TIMEOUT')).toBe(60000);
    expect(generated.get('REPEAT_TIMEOUT')).toBe(60000);
  });

  it('should replace any old repo url from settings.json to the new one', async () => {
    // arrange
    prepareEnvFile();
    await fs.promises.writeFile(
      path.join(DATA_DIR, 'state', 'settings.json'),
      JSON.stringify({
        appsRepoUrl: 'https://github.com/meienberger/runtipi-appstore',
      }),
    );

    // act
    const generated = await generateSystemEnvFile();

    // assert
    expect(generated.get('APPS_REPO_URL')).toBe('https://github.com/runtipi/runtipi-appstore');
  });

  it('should not replace a repo url from settings.json if it is not the old one', async () => {
    // arrange
    prepareEnvFile();
    const url = faker.internet.url();
    await fs.promises.writeFile(
      path.join(DATA_DIR, 'state', 'settings.json'),
      JSON.stringify({
        appsRepoUrl: url,
      }),
    );

    // act
    const generated = await generateSystemEnvFile();

    // assert
    expect(generated.get('APPS_REPO_URL')).toBe(url);
  });

  it('should not replace an existing JWT_SECRET from env file', async () => {
    // arrange
    const secret = faker.word.adverb();
    envMap.set('JWT_SECRET', secret);
    prepareEnvFile();

    // act
    const generated = await generateSystemEnvFile();

    // assert
    expect(generated.get('JWT_SECRET')).toBe(secret);
  });
});
