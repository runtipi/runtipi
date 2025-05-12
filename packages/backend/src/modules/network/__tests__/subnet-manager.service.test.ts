import { TranslatableError } from '@/common/error/translatable-error';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { DOCKERODE } from '@/modules/docker/docker.module';
import { Test } from '@nestjs/testing';
import type { AppUrn } from '@runtipi/common/types';
import { fromAny, fromPartial } from '@total-typescript/shoehorn';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { SubnetManagerService } from '../subnet-manager.service';

// Create a mock for Dockerode
const dockerMock = {
  listNetworks: vi.fn().mockResolvedValue([]),
  pruneNetworks: vi.fn(),
};

describe('SubnetManagerService', () => {
  let service: SubnetManagerService;
  let appsRepository = mock<AppsRepository>();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SubnetManagerService, { provide: DOCKERODE, useValue: dockerMock }],
    })
      .useMocker(mock)
      .compile();

    service = moduleRef.get<SubnetManagerService>(SubnetManagerService);
    appsRepository = moduleRef.get(AppsRepository);

    vi.clearAllMocks();
    dockerMock.listNetworks.mockReset().mockResolvedValue([]);
    dockerMock.pruneNetworks.mockReset().mockResolvedValue(undefined);
  });

  describe('allocateSubnet', () => {
    it('should throw an error if app is not found', async () => {
      // arrange
      const appUrn = 'app:test/app' as AppUrn;
      appsRepository.getAppByUrn.mockResolvedValue(fromAny(null));

      // act & assert
      await expect(service.allocateSubnet(appUrn)).rejects.toThrow(TranslatableError);
    });

    it('should allocate a new subnet if app does not have one', async () => {
      // arrange
      const appUrn = 'app:test/app' as AppUrn;
      const newSubnet = '10.128.10.0/24';
      appsRepository.getAppByUrn.mockResolvedValue(
        fromPartial({
          id: 1,
          subnet: null,
        }),
      );

      dockerMock.listNetworks.mockResolvedValue([]);
      appsRepository.updateAppById.mockResolvedValue(fromPartial({ id: 1, subnet: newSubnet }));

      // act
      const result = await service.allocateSubnet(appUrn);

      // assert
      expect(result).toBe(newSubnet);
      expect(appsRepository.updateAppById).toHaveBeenCalledWith(1, { subnet: newSubnet });
    });

    it('should skip already allocated subnets when allocating a new one', async () => {
      // arrange
      const appUrn = 'app:test/app' as AppUrn;
      const expectedSubnet = '10.128.12.0/24';

      dockerMock.listNetworks.mockResolvedValue([
        { IPAM: { Config: [{ Subnet: '10.128.10.0/24' }] } },
        { IPAM: { Config: [{ Subnet: '10.128.11.0/24' }] } },
      ]);

      appsRepository.getAppByUrn.mockResolvedValue(fromPartial({ id: 1, subnet: null }));
      appsRepository.updateAppById.mockResolvedValue(fromPartial({ id: 1, subnet: expectedSubnet }));

      // act
      const result = await service.allocateSubnet(appUrn);

      // assert
      expect(result).toBe(expectedSubnet);
      expect(appsRepository.updateAppById).toHaveBeenCalledWith(1, { subnet: expectedSubnet });
    });

    it('should throw an error when no more subnets are available', async () => {
      // arrange
      const appUrn = 'app:test/app' as AppUrn;

      // Create mock for Docker with all subnets allocated
      const networkMocks = [];
      for (let i = 10; i <= 254; i++) {
        networkMocks.push({
          IPAM: { Config: [{ Subnet: `10.128.${i}.0/24` }] },
        });
      }
      dockerMock.listNetworks.mockResolvedValue(networkMocks);

      appsRepository.getAppByUrn.mockResolvedValue(
        fromPartial({
          id: 1,
          subnet: null,
        }),
      );

      // act & assert
      await expect(service.allocateSubnet(appUrn)).rejects.toThrow(TranslatableError);
      expect(appsRepository.updateAppById).not.toHaveBeenCalled();
    });
  });

  describe('findNextAvailableSubnet', () => {
    it('should return the first available subnet after reserved subnets', async () => {
      // arrange
      const appUrn = 'app:test/app' as AppUrn;
      appsRepository.getAppByUrn.mockResolvedValue(
        fromPartial({
          id: 1,
          subnet: null,
        }),
      );
      dockerMock.listNetworks.mockResolvedValue([]);
      appsRepository.updateAppById.mockImplementation((id, subnet) => Promise.resolve(fromAny({ id, subnet })));

      // act
      const result = await service.allocateSubnet(appUrn);

      // assert
      expect(result).toBe('10.128.10.0/24');
    });

    it('should find gaps in allocated subnets', async () => {
      // arrange
      const appUrn = 'app:test/app' as AppUrn;

      dockerMock.listNetworks.mockResolvedValue([
        { IPAM: { Config: [{ Subnet: '10.128.10.0/24' }] } },
        { IPAM: { Config: [{ Subnet: '10.128.12.0/24' }] } },
        { IPAM: { Config: [{ Subnet: '10.128.13.0/24' }] } },
      ]);

      appsRepository.getAppByUrn.mockResolvedValue(
        fromPartial({
          id: 1,
          subnet: null,
        }),
      );
      appsRepository.updateAppById.mockImplementation((id, subnet) => Promise.resolve(fromAny({ id, subnet })));

      // act
      const result = await service.allocateSubnet(appUrn);

      // assert
      expect(result).toBe('10.128.11.0/24');
    });

    it('should handle malformed subnet strings correctly', async () => {
      // arrange
      const appUrn = 'app:test/app' as AppUrn;

      dockerMock.listNetworks.mockResolvedValue([
        { IPAM: { Config: [{ Subnet: '10.128.10.0/24' }] } },
        { IPAM: { Config: [{ Subnet: 'invalid-subnet' }] } },
        { IPAM: { Config: [{ Subnet: '10.128.11.0/24' }] } },
      ]);

      appsRepository.getAppByUrn.mockResolvedValue(
        fromPartial({
          id: 1,
          subnet: null,
        }),
      );
      appsRepository.updateAppById.mockImplementation((id, subnet) => Promise.resolve(fromAny({ id, subnet })));

      // act
      const result = await service.allocateSubnet(appUrn);

      // assert
      expect(result).toBe('10.128.12.0/24');
    });
  });
});
