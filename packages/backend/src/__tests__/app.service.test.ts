import fs from 'node:fs';
import { AppService } from '@/app.service';
import { APP_DATA_DIR, APP_DIR, DATA_DIR, LATEST_RELEASE_URL } from '@/common/constants';
import { CacheService } from '@/core/cache/cache.service';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { FsMock } from '@/tests/__mocks__/fs';
import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

const server = setupServer();

describe('AppService', () => {
  let appService: AppService;
  let configurationService = mock<ConfigurationService>();
  let cacheService = mock<CacheService>();

  beforeAll(() => {
    server.listen();
    server.use(
      http.get(LATEST_RELEASE_URL, () => {
        return HttpResponse.json({
          tag_name: 'latest',
          body: 'body',
        });
      }),
    );
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AppService, FilesystemService],
    })
      .useMocker(mock)
      .compile();

    appService = moduleRef.get(AppService);
    configurationService = moduleRef.get(ConfigurationService);
    cacheService = moduleRef.get(CacheService);
  });

  describe('getVersion', () => {
    it('should return the version', async () => {
      // arrange
      const version = faker.system.semver();
      configurationService.getConfig.mockReturnValueOnce(fromPartial({ version }));

      // act
      const result = await appService.getVersion();

      // assert
      expect(result.current).toBe(version);
    });

    it('shoult return version from cache if set', async () => {
      // arrange
      const version = faker.system.semver();
      const latest = faker.system.semver();
      configurationService.getConfig.mockReturnValueOnce(fromPartial({ version }));
      cacheService.get.calledWith('latestVersion').mockReturnValueOnce(latest);
      cacheService.get.calledWith('latestVersionBody').mockReturnValueOnce('body');

      // act
      const result = await appService.getVersion();

      // assert
      expect(result.current).toBe(version);
      expect(result.latest).toBe(latest);
      expect(result.body).toBe('body');
    });

    it('should fetch latest version from github if not in cache', async () => {
      // arrange
      const version = faker.system.semver();
      const latest = faker.system.semver();
      const body = faker.lorem.paragraph();
      configurationService.getConfig.mockReturnValueOnce(fromPartial({ version }));
      cacheService.get.calledWith('latestVersion').mockReturnValueOnce(undefined);
      cacheService.get.calledWith('latestVersionBody').mockReturnValueOnce(undefined);

      const mockFetch = vi.fn();

      server.use(
        http.get(LATEST_RELEASE_URL, () => {
          mockFetch();
          return HttpResponse.json({
            tag_name: latest,
            body,
          });
        }),
      );

      // act
      await appService.getVersion();
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should return current version if cache fails', async () => {
      // arrange
      const version = faker.system.semver();
      configurationService.getConfig.mockReturnValueOnce(fromPartial({ version }));
      cacheService.get.calledWith('latestVersion').mockImplementationOnce(() => {
        throw new Error('error');
      });

      // act
      const result = await appService.getVersion();

      // assert
      expect(result.current).toBe(version);
      expect(result.latest).toBe(version);
      expect(result.body).toBe('');
    });

    it('should return current version if fetch fails', async () => {
      // arrange
      const version = faker.system.semver();
      configurationService.getConfig.mockReturnValueOnce(fromPartial({ version }));
      cacheService.get.calledWith('latestVersion').mockReturnValueOnce(undefined);

      server.use(
        http.get(LATEST_RELEASE_URL, () => {
          return new HttpResponse('error', { status: 500 });
        }),
      );

      // act
      const result = await appService.getVersion();

      // assert
      expect(result.current).toBe(version);
      expect(result.latest).toBe(version);
      expect(result.body).toBe('');
    });
  });

  describe('copyAssets', () => {
    it('should create base folder structure', async () => {
      // arrange
      const appDir = APP_DIR;
      const dataDir = DATA_DIR;
      const appDataDir = APP_DATA_DIR;
      const directories = { appDir, dataDir, appDataDir };
      configurationService.getConfig.mockReturnValueOnce(fromPartial({ directories, userSettings: { persistTraefikConfig: false } }));

      // act
      await appService.copyAssets();

      // assert
      expect((fs as unknown as FsMock).tree()).toMatchSnapshot();
    });
  });
});
