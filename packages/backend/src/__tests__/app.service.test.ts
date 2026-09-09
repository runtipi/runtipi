import fs from 'node:fs';
import path from 'node:path';
import { AppService } from '@/app.service';
import { APP_DATA_DIR, APP_DIR, DATA_DIR } from '@/common/constants';
import { execFileAsync } from '@/common/helpers/exec-helpers';
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
import YAML from 'yaml';

vi.mock('@/common/helpers/exec-helpers', () => ({
  execFileAsync: vi.fn(),
}));

const TRAEFIK_CONFIG = `api:
  dashboard: true
  insecure: true

entryPoints:
  web:
    address: ":80"
    forwardedHeaders:
      insecure: true
      trustedIPs:
        - "127.0.0.1/32"
  websecure:
    address: ":443"
    forwardedHeaders:
      trustedIPs:
        - "127.0.0.1/32"
    http:
      tls:
        certResolver: myresolver
`;

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

  describe('generateTlsCertificates', () => {
    it('should stop when local CA generation fails', async () => {
      // arrange
      const localDomain = 'test.home.arpa';
      const tlsFolder = path.join(DATA_DIR, 'traefik', 'tls');
      const fsMock = fs as unknown as FsMock;

      fsMock.__createMockFiles({
        [path.join(tlsFolder, '.gitkeep')]: '',
      });

      configurationService.get.calledWith('directories').mockReturnValue(
        fromPartial({
          dataDir: DATA_DIR,
        }),
      );

      vi.mocked(execFileAsync).mockClear();
      vi.mocked(execFileAsync).mockResolvedValue(
        fromPartial({
          stdout: '',
          stderr: 'CA generation failed',
        }),
      );

      // act
      await appService.generateTlsCertificates({ localDomain });

      // assert
      const calls = vi.mocked(execFileAsync).mock.calls;

      expect(calls).toHaveLength(1);
      expect(calls[0]?.[1]).toContain('basicConstraints=critical,CA:TRUE');
      expect(await fs.promises.stat(path.join(tlsFolder, 'cert.pem')).catch(() => null)).toBeNull();
    });

    it('should generate a new local CA when the legacy certificate is expired', async () => {
      // arrange
      const localDomain = 'test.home.arpa';
      const tlsFolder = path.join(DATA_DIR, 'traefik', 'tls');
      const fsMock = fs as unknown as FsMock;

      fsMock.__createMockFiles({
        [path.join(tlsFolder, 'cert.pem')]: 'expired-legacy-certificate',
        [path.join(tlsFolder, 'key.pem')]: 'expired-legacy-private-key',
        [path.join(tlsFolder, `${localDomain}.txt`)]: '',
      });

      configurationService.get.calledWith('directories').mockReturnValue(
        fromPartial({
          dataDir: DATA_DIR,
        }),
      );

      vi.mocked(execFileAsync).mockClear();

      vi.mocked(execFileAsync)
        .mockResolvedValueOnce(
          fromPartial({
            stdout: 'Certificate will expire',
            stderr: '',
          }),
        )
        .mockImplementation(async (_command, args) => {
          if (args?.includes('basicConstraints=critical,CA:TRUE')) {
            await fs.promises.writeFile(path.join(tlsFolder, 'ca.pem'), 'generated-ca-certificate');
            await fs.promises.writeFile(path.join(tlsFolder, 'ca-key.pem'), 'generated-ca-private-key');
          }

          return fromPartial({
            stdout: '',
            stderr: '',
          });
        });

      // act
      await appService.generateTlsCertificates({ localDomain });

      // assert
      const calls = vi
        .mocked(execFileAsync)
        .mock.calls.filter(([command]) => command === 'openssl')
        .map(([, args]) => args ?? []);

      const allArgs = calls.flat();

      expect(allArgs).toContain('basicConstraints=critical,CA:TRUE');
      expect(allArgs).toContain('basicConstraints=critical,CA:FALSE');
      expect(allArgs).toContain('extendedKeyUsage=serverAuth');
    });

    it('should renew an expiring server certificate without replacing the local CA', async () => {
      // arrange
      const localDomain = 'test.home.arpa';
      const tlsFolder = path.join(DATA_DIR, 'traefik', 'tls');
      const fsMock = fs as unknown as FsMock;

      fsMock.__createMockFiles({
        [path.join(tlsFolder, 'ca.pem')]: 'existing-ca-certificate',
        [path.join(tlsFolder, 'ca-key.pem')]: 'existing-ca-private-key',
        [path.join(tlsFolder, 'cert.pem')]: 'expiring-server-certificate',
        [path.join(tlsFolder, 'key.pem')]: 'expiring-server-private-key',
        [path.join(tlsFolder, `${localDomain}.txt`)]: '',
      });

      configurationService.get.calledWith('directories').mockReturnValue(
        fromPartial({
          dataDir: DATA_DIR,
        }),
      );

      vi.mocked(execFileAsync).mockClear();

      vi.mocked(execFileAsync)
        .mockResolvedValueOnce(
          fromPartial({
            stdout: 'Certificate will expire',
            stderr: '',
          }),
        )
        .mockResolvedValue(
          fromPartial({
            stdout: '',
            stderr: '',
          }),
        );

      // act
      await appService.generateTlsCertificates({ localDomain });

      // assert
      expect(await fs.promises.readFile(path.join(tlsFolder, 'ca.pem'), 'utf8')).toBe('existing-ca-certificate');
      expect(await fs.promises.readFile(path.join(tlsFolder, 'ca-key.pem'), 'utf8')).toBe('existing-ca-private-key');

      const calls = vi
        .mocked(execFileAsync)
        .mock.calls.filter(([command]) => command === 'openssl')
        .map(([, args]) => args ?? []);

      const allArgs = calls.flat();

      expect(allArgs).not.toContain('basicConstraints=critical,CA:TRUE');
      expect(allArgs).toContain('basicConstraints=critical,CA:FALSE');
      expect(allArgs).toContain('extendedKeyUsage=serverAuth');
      expect(allArgs).toContain(path.join(tlsFolder, 'ca.pem'));
    });

    it('should keep the existing local CA when the local domain changes', async () => {
      // arrange
      const oldLocalDomain = 'old.home.arpa';
      const newLocalDomain = 'new.home.arpa';
      const tlsFolder = path.join(DATA_DIR, 'traefik', 'tls');
      const fsMock = fs as unknown as FsMock;

      fsMock.__createMockFiles({
        [path.join(tlsFolder, 'ca.pem')]: 'existing-ca-certificate',
        [path.join(tlsFolder, 'ca-key.pem')]: 'existing-ca-private-key',
        [path.join(tlsFolder, 'cert.pem')]: 'old-server-certificate',
        [path.join(tlsFolder, 'key.pem')]: 'old-server-private-key',
        [path.join(tlsFolder, `${oldLocalDomain}.txt`)]: '',
      });

      configurationService.get.calledWith('directories').mockReturnValue(
        fromPartial({
          dataDir: DATA_DIR,
        }),
      );

      vi.mocked(execFileAsync).mockClear();
      vi.mocked(execFileAsync).mockResolvedValue(
        fromPartial({
          stdout: '',
          stderr: '',
        }),
      );

      // act
      await appService.generateTlsCertificates({ localDomain: newLocalDomain });

      // assert
      expect(await fs.promises.readFile(path.join(tlsFolder, 'ca.pem'), 'utf8')).toBe('existing-ca-certificate');
      expect(await fs.promises.readFile(path.join(tlsFolder, 'ca-key.pem'), 'utf8')).toBe('existing-ca-private-key');

      const calls = vi
        .mocked(execFileAsync)
        .mock.calls.filter(([command]) => command === 'openssl')
        .map(([, args]) => args ?? []);

      const allArgs = calls.flat();

      expect(allArgs).not.toContain('basicConstraints=critical,CA:TRUE');
      expect(allArgs).toContain('basicConstraints=critical,CA:FALSE');
      expect(allArgs).toContain('extendedKeyUsage=serverAuth');
      expect(allArgs).toContain(`subjectAltName=DNS:*.${newLocalDomain},DNS:${newLocalDomain}`);
    });

    it('should keep the existing local CA when the server certificate is still valid', async () => {
      // arrange
      const localDomain = 'test.home.arpa';
      const tlsFolder = path.join(DATA_DIR, 'traefik', 'tls');
      const fsMock = fs as unknown as FsMock;

      fsMock.__createMockFiles({
        [path.join(tlsFolder, 'ca.pem')]: 'existing-ca-certificate',
        [path.join(tlsFolder, 'ca-key.pem')]: 'existing-ca-private-key',
        [path.join(tlsFolder, 'cert.pem')]: 'existing-server-certificate',
        [path.join(tlsFolder, 'key.pem')]: 'existing-server-private-key',
        [path.join(tlsFolder, `${localDomain}.txt`)]: '',
      });

      configurationService.get.calledWith('directories').mockReturnValue(
        fromPartial({
          dataDir: DATA_DIR,
        }),
      );

      vi.mocked(execFileAsync).mockClear();
      vi.mocked(execFileAsync).mockResolvedValue(
        fromPartial({
          stdout: 'Certificate will not expire',
          stderr: '',
        }),
      );

      // act
      await appService.generateTlsCertificates({ localDomain });

      // assert
      expect(vi.mocked(execFileAsync)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(execFileAsync)).toHaveBeenCalledWith('openssl', [
        'x509',
        '-checkend',
        '86400',
        '-noout',
        '-in',
        path.join(tlsFolder, 'cert.pem'),
      ]);

      expect(await fs.promises.readFile(path.join(tlsFolder, 'ca.pem'), 'utf8')).toBe('existing-ca-certificate');
      expect(await fs.promises.readFile(path.join(tlsFolder, 'ca-key.pem'), 'utf8')).toBe('existing-ca-private-key');
    });

    it('should preserve the legacy certificate as the local CA when migrating', async () => {
      // arrange
      const localDomain = 'test.home.arpa';
      const tlsFolder = path.join(DATA_DIR, 'traefik', 'tls');
      const fsMock = fs as unknown as FsMock;

      fsMock.__createMockFiles({
        [path.join(tlsFolder, 'cert.pem')]: 'legacy-certificate',
        [path.join(tlsFolder, 'key.pem')]: 'legacy-private-key',
        [path.join(tlsFolder, `${localDomain}.txt`)]: '',
      });

      configurationService.get.calledWith('directories').mockReturnValue(
        fromPartial({
          dataDir: DATA_DIR,
        }),
      );

      vi.mocked(execFileAsync).mockClear();
      vi.mocked(execFileAsync).mockResolvedValue(
        fromPartial({
          stdout: 'Certificate will not expire',
          stderr: '',
        }),
      );

      // act
      await appService.generateTlsCertificates({ localDomain });

      // assert
      expect(await fs.promises.readFile(path.join(tlsFolder, 'ca.pem'), 'utf8')).toBe('legacy-certificate');
      expect(await fs.promises.readFile(path.join(tlsFolder, 'ca-key.pem'), 'utf8')).toBe('legacy-private-key');
      expect(vi.mocked(execFileAsync)).toHaveBeenCalledWith(
        'openssl',
        expect.arrayContaining(['x509', '-req', '-CA', path.join(tlsFolder, 'ca.pem')]),
      );
    });

    it('should generate a CA certificate and a separate server certificate', async () => {
      // arrange
      const localDomain = 'test.home.arpa';
      const fsMock = fs as unknown as FsMock;

      fsMock.__createMockFiles({
        [path.join(DATA_DIR, 'traefik', 'tls', '.gitkeep')]: '',
      });

      configurationService.get.calledWith('directories').mockReturnValue(
        fromPartial({
          dataDir: DATA_DIR,
        }),
      );

      vi.mocked(execFileAsync).mockClear();
      vi.mocked(execFileAsync).mockImplementation(async (_command, args) => {
        if (args?.includes('basicConstraints=critical,CA:TRUE')) {
          await fs.promises.writeFile(path.join(DATA_DIR, 'traefik', 'tls', 'ca.pem'), 'generated-ca-certificate');
          await fs.promises.writeFile(path.join(DATA_DIR, 'traefik', 'tls', 'ca-key.pem'), 'generated-ca-private-key');
        }

        return fromPartial({
          stdout: '',
          stderr: '',
        });
      });

      // act
      await appService.generateTlsCertificates({ localDomain });

      // assert
      const calls = vi
        .mocked(execFileAsync)
        .mock.calls.filter(([command]) => command === 'openssl')
        .map(([, args]) => args ?? []);

      const allArgs = calls.flat();

      expect(allArgs).toContain('basicConstraints=critical,CA:TRUE');
      expect(allArgs).toContain('basicConstraints=critical,CA:FALSE');
      expect(allArgs).toContain('extendedKeyUsage=serverAuth');

      expect(allArgs).toContain(path.join(DATA_DIR, 'traefik', 'tls', 'ca.pem'));
      expect(allArgs).toContain(path.join(DATA_DIR, 'traefik', 'tls', 'cert.pem'));
      expect(allArgs).toContain(path.join(DATA_DIR, 'traefik', 'tls', 'key.pem'));
    });
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

    it('should use only configured trusted proxy IPs in traefik config', async () => {
      const appDir = APP_DIR;
      const dataDir = DATA_DIR;
      const appDataDir = APP_DATA_DIR;
      const directories = { appDir, dataDir, appDataDir };
      const fsMock = fs as unknown as FsMock;
      fsMock.__applyMockFiles({
        [path.join(APP_DIR, 'assets', 'traefik', 'traefik.yml')]: TRAEFIK_CONFIG,
        [path.join(APP_DIR, 'assets', 'traefik', 'dynamic', 'dynamic.yml')]: '',
      });
      configurationService.getConfig.mockReturnValueOnce(fromPartial({ directories, userSettings: { persistTraefikConfig: false } }));
      configurationService.get.calledWith('traefik').mockReturnValueOnce({
        trustedProxyIps: ['203.0.113.10/32', '2001:db8::/32', '203.0.113.10/32'],
      });

      await appService.copyAssets();

      const output = await fs.promises.readFile(path.join(DATA_DIR, 'traefik', 'traefik.yml'), 'utf8');
      const parsed = YAML.parse(output);
      expect(parsed.entryPoints.web.forwardedHeaders.insecure).toBe(true);
      expect(parsed.entryPoints.web.forwardedHeaders.trustedIPs).toEqual(['203.0.113.10/32', '2001:db8::/32']);
      expect(parsed.entryPoints.websecure.forwardedHeaders.trustedIPs).toEqual(['203.0.113.10/32', '2001:db8::/32']);
    });

    it('should remove default trusted proxy IPs from traefik config when none are configured', async () => {
      const appDir = APP_DIR;
      const dataDir = DATA_DIR;
      const appDataDir = APP_DATA_DIR;
      const directories = { appDir, dataDir, appDataDir };
      const fsMock = fs as unknown as FsMock;
      fsMock.__applyMockFiles({
        [path.join(APP_DIR, 'assets', 'traefik', 'traefik.yml')]: TRAEFIK_CONFIG,
        [path.join(APP_DIR, 'assets', 'traefik', 'dynamic', 'dynamic.yml')]: '',
      });
      configurationService.getConfig.mockReturnValueOnce(fromPartial({ directories, userSettings: { persistTraefikConfig: false } }));
      configurationService.get.calledWith('traefik').mockReturnValueOnce({
        trustedProxyIps: [],
      });

      await appService.copyAssets();

      const output = await fs.promises.readFile(path.join(DATA_DIR, 'traefik', 'traefik.yml'), 'utf8');
      const parsed = YAML.parse(output);
      expect(parsed.entryPoints.web.forwardedHeaders.insecure).toBe(true);
      expect(parsed.entryPoints.web.forwardedHeaders.trustedIPs).toBeUndefined();
      expect(parsed.entryPoints.websecure.forwardedHeaders).toBeUndefined();
    });
  });
});
