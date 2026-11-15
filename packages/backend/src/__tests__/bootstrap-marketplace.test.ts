import path from 'node:path';
import { AppService } from '@/app.service';
import { APP_DIR, DATA_DIR, APP_DATA_DIR } from '@/common/constants';
import { ConfigurationService } from '@/core/config/configuration.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LocalTlsService } from '@/core/local-tls/local-tls.service';
import { AppLifecycleService } from '@/modules/app-lifecycle/app-lifecycle.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import { SystemEventsQueue } from '@/modules/queue/entities/system-events';
import { DOCKERODE } from '@/modules/docker/docker.constants';
import { Test } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { expect, test, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

test('a failed marketplace refresh does not skip assets, TLS, status sync, or upgrade restarts', async () => {
  const config = mock<ConfigurationService>();
  config.getConfig.mockReturnValue(
    fromPartial({
      version: 'upgraded',
      __prod__: true,
      directories: { dataDir: DATA_DIR, appDir: APP_DIR, appDataDir: APP_DATA_DIR },
      userSettings: { localDomain: 'tipi.lan', persistTraefikConfig: true },
    }),
  );
  const module = await Test.createTestingModule({
    providers: [
      AppService,
      FilesystemService,
      { provide: ConfigurationService, useValue: config },
      { provide: DOCKERODE, useValue: { pruneNetworks: vi.fn().mockResolvedValue(undefined) } },
    ],
  })
    .useMocker(() => mock())
    .compile();
  module.get(MarketplaceService).initialize = async () => {
    throw new Error('Repository unavailable');
  };

  await module.get(AppService).bootstrap();

  expect(await module.get(FilesystemService).isDirectory(path.join(DATA_DIR, 'apps'))).toBe(true);
  expect(module.get(LocalTlsService).ensure).toHaveBeenCalledWith('tipi.lan');
  expect(module.get(SystemEventsQueue).publishRepeatable).toHaveBeenCalledWith({ command: 'sync_app_statuses' }, '*/5 * * * *');
  expect(module.get(AppLifecycleService).restartRunningApps).toHaveBeenCalledOnce();
});
