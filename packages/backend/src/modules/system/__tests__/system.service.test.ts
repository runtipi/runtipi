import path from 'node:path';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { SystemService } from '@/modules/system/system.service';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('SystemService', () => {
  let systemService: SystemService;
  let configurationService = mock<ConfigurationService>();
  let filesystemService = mock<FilesystemService>();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SystemService],
    })
      .useMocker(mock)
      .compile();

    systemService = moduleRef.get(SystemService);
    configurationService = moduleRef.get(ConfigurationService);
    filesystemService = moduleRef.get(FilesystemService);
  });

  describe('getLocalCertificate', () => {
    it('should return the local CA certificate', async () => {
      const dataDir = '/data';
      const caPath = path.join(dataDir, 'traefik', 'tls', 'ca.pem');

      configurationService.get.calledWith('directories').mockReturnValue({
        dataDir,
      } as never);

      filesystemService.isFile.mockResolvedValue(true);
      filesystemService.readTextFile.mockResolvedValue('test-ca-certificate');

      const result = await systemService.getLocalCertificate();

      expect(filesystemService.isFile).toHaveBeenCalledWith(caPath);
      expect(filesystemService.readTextFile).toHaveBeenCalledWith(caPath);
      expect(result).toBe('test-ca-certificate');
    });
  });
});
