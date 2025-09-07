import fs from 'node:fs';
import { AppService } from '@/app.service';
import { APP_DATA_DIR, APP_DIR, DATA_DIR } from '@/common/constants';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import type { FsMock } from '@/tests/__mocks__/fs';
import { GithubService } from '@/utils/github/github.service';
import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { DOCKERODE } from '@/modules/docker/docker.module';

describe('AppService', () => {
  let appService: AppService;
  let configurationService = mock<ConfigurationService>();
  let githubService = mock<GithubService>();

  beforeEach(async () => {
    const Dockerode = vi.fn();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AppService,
        FilesystemService,
        {
          provide: DOCKERODE,
          useFactory: () => Dockerode,
          inject: [],
        },
      ],
    })
      .useMocker(mock)
      .compile();

    appService = moduleRef.get(AppService);
    configurationService = moduleRef.get(ConfigurationService);
    githubService = moduleRef.get(GithubService);
  });

  describe('getVersion', () => {
    it('should return the version', async () => {
      // arrange
      const version = faker.system.semver();
      const latest = faker.system.semver();
      const body = faker.lorem.paragraph();
      configurationService.getConfig.mockReturnValueOnce(fromPartial({ version }));
      githubService.getLatestRelease.mockResolvedValueOnce({ version: latest, body });
      githubService.getReleasesSince.mockResolvedValueOnce([]);

      // act
      const result = await appService.getVersion();

      // assert
      expect(result.current).toBe(version);
      expect(result.latest).toBe(latest);
      expect(result.body).toBe(body);
    });

    it('should return version from cache if set', async () => {
      // arrange
      const version = faker.system.semver();
      const latest = faker.system.semver();
      const body = faker.lorem.paragraph();
      configurationService.getConfig.mockReturnValueOnce(fromPartial({ version }));
      githubService.getLatestRelease.mockResolvedValueOnce({ version: latest, body });
      githubService.getReleasesSince.mockResolvedValueOnce([]);

      // act
      const result = await appService.getVersion();

      // assert
      expect(result.current).toBe(version);
      expect(result.latest).toBe(latest);
      expect(result.body).toBe(body);
    });

    it('should fetch latest version from github if not in cache', async () => {
      // arrange
      const version = faker.system.semver();
      const latest = faker.system.semver();
      const body = faker.lorem.paragraph();
      configurationService.getConfig.mockReturnValueOnce(fromPartial({ version }));
      githubService.getLatestRelease.mockResolvedValueOnce({ version: latest, body });
      githubService.getReleasesSince.mockResolvedValueOnce([]);

      // act
      const result = await appService.getVersion();

      // assert
      expect(result.current).toBe(version);
      expect(result.latest).toBe(latest);
      expect(result.body).toBe(body);
      expect(githubService.getLatestRelease).toHaveBeenCalledWith('runtipi', 'runtipi');
      expect(githubService.getReleasesSince).toHaveBeenCalledWith('runtipi', 'runtipi', version);
    });

    it('should return current version if github service returns empty', async () => {
      // arrange
      const version = faker.system.semver();
      configurationService.getConfig.mockReturnValueOnce(fromPartial({ version }));
      githubService.getLatestRelease.mockResolvedValueOnce({ version: '', body: '' });
      githubService.getReleasesSince.mockResolvedValueOnce([]);

      // act
      const result = await appService.getVersion();

      // assert
      expect(result.current).toBe(version);
      expect(result.latest).toBe(version); // Should fall back to current version when github returns empty string
      expect(result.body).toBe('');
    });

    it('should return current version if github service returns empty', async () => {
      // arrange
      const version = faker.system.semver();
      configurationService.getConfig.mockReturnValueOnce(fromPartial({ version }));
      githubService.getLatestRelease.mockResolvedValueOnce({ version: '', body: '' });
      githubService.getReleasesSince.mockResolvedValueOnce([]);

      // act
      const result = await appService.getVersion();

      // assert
      expect(result.current).toBe(version);
      expect(result.latest).toBe(version); // Should fall back to current version when github returns empty string
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
