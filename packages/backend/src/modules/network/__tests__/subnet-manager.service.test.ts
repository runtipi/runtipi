import { TranslatableError } from '@/common/error/translatable-error';
import { AppsRepository } from '@/modules/apps/apps.repository';
import { Test } from '@nestjs/testing';
import type { AppUrn } from '@runtipi/common/types';
import { fromAny, fromPartial } from '@total-typescript/shoehorn';
import { beforeEach, describe, expect, it } from 'vitest';
import { mock, mockReset } from 'vitest-mock-extended';
import { SubnetManagerService } from '../subnet-manager.service';

describe('SubnetManagerService', () => {
  let service: SubnetManagerService;
  let appsRepository = mock<AppsRepository>();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [SubnetManagerService],
    })
      .useMocker(mock)
      .compile();

    service = moduleRef.get<SubnetManagerService>(SubnetManagerService);
    appsRepository = moduleRef.get(AppsRepository);

    mockReset(appsRepository);
  });

  describe('allocateSubnet', () => {
    it('should throw an error if app is not found', async () => {
      // arrange
      const appUrn = 'app:test/app' as AppUrn;
      appsRepository.getAppByUrn.mockResolvedValue(fromAny(null));

      // act & assert
      await expect(service.allocateSubnet(appUrn)).rejects.toThrow(TranslatableError);
    });

    it('should return existing subnet if app already has one', async () => {
      // arrange
      const appUrn = 'app:test/app' as AppUrn;
      const existingSubnet = '10.128.10.0/24';
      appsRepository.getAppByUrn.mockResolvedValue(
        fromPartial({
          id: 1,
          subnet: existingSubnet,
        }),
      );

      // act
      const result = await service.allocateSubnet(appUrn);

      // assert
      expect(result).toBe(existingSubnet);
      expect(appsRepository.updateAppById).not.toHaveBeenCalled();
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
      appsRepository.getApps.mockResolvedValue([]);
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
      const existingSubnets = [
        { id: 2, subnet: '10.128.10.0/24' },
        { id: 3, subnet: '10.128.11.0/24' },
      ];
      const expectedSubnet = '10.128.12.0/24';

      appsRepository.getAppByUrn.mockResolvedValue(
        fromPartial({
          id: 1,
          subnet: null,
        }),
      );
      appsRepository.getApps.mockResolvedValue(fromPartial(existingSubnets));
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

      const existingSubnets = [];
      for (let i = 10; i <= 254; i++) {
        existingSubnets.push({ id: i, subnet: `10.128.${i}.0/24` });
      }

      appsRepository.getAppByUrn.mockResolvedValue(
        fromPartial({
          id: 1,
          subnet: null,
        }),
      );
      appsRepository.getApps.mockResolvedValue(fromPartial(existingSubnets));

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
      appsRepository.getApps.mockResolvedValue([]);
      appsRepository.updateAppById.mockImplementation((id, subnet) => Promise.resolve(fromAny({ id, subnet })));

      // act
      const result = await service.allocateSubnet(appUrn);

      // assert
      expect(result).toBe('10.128.10.0/24');
    });

    it('should find gaps in allocated subnets', async () => {
      // arrange
      const appUrn = 'app:test/app' as AppUrn;
      const existingSubnets = [
        { id: 10, subnet: '10.128.10.0/24' },
        { id: 12, subnet: '10.128.12.0/24' },
        { id: 13, subnet: '10.128.13.0/24' },
      ];

      appsRepository.getAppByUrn.mockResolvedValue(
        fromPartial({
          id: 1,
          subnet: null,
        }),
      );
      appsRepository.getApps.mockResolvedValue(fromPartial(existingSubnets));
      appsRepository.updateAppById.mockImplementation((id, subnet) => Promise.resolve(fromAny({ id, subnet })));

      // act
      const result = await service.allocateSubnet(appUrn);

      // assert
      expect(result).toBe('10.128.11.0/24');
    });

    it('should handle malformed subnet strings correctly', async () => {
      // arrange
      const appUrn = 'app:test/app' as AppUrn;
      const existingSubnets = [
        { id: 10, subnet: '10.128.10.0/24' },
        { id: 11, subnet: 'invalid-subnet' }, // Should be ignored
        { id: 12, subnet: '10.128.11.0/24' },
      ];

      appsRepository.getAppByUrn.mockResolvedValue(
        fromPartial({
          id: 1,
          subnet: null,
        }),
      );
      appsRepository.getApps.mockResolvedValue(fromPartial(existingSubnets));
      appsRepository.updateAppById.mockImplementation((id, subnet) => Promise.resolve(fromAny({ id, subnet })));

      // act
      const result = await service.allocateSubnet(appUrn);

      // assert
      expect(result).toBe('10.128.12.0/24');
    });
  });
});
