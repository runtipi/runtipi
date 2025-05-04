import { TranslatableError } from '@/common/error/translatable-error';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { AppsRepository } from '../apps/apps.repository';

const BASE_SUBNET_PREFIX = '10.128';
const SUBNET_MASK = '/24';

const RESERVED_SUBNET_MAX = 9;
const MAX_SUBNET_OCTET = 254; // Maximum value for the third octet (x in 10.128.x.0/24)

@Injectable()
export class SubnetManagerService {
  constructor(
    private readonly appsRepository: AppsRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Allocate a subnet for an app
   * @param appUrn The URN of the app to allocate a subnet for
   * @returns The allocated subnet with mask (e.g., 10.128.10.0/24)
   */
  public async allocateSubnet(appUrn: AppUrn): Promise<string> {
    const existingApp = await this.appsRepository.getAppByUrn(appUrn);

    if (!existingApp) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND');
    }

    if (existingApp?.subnet) {
      this.logger.info(`App ${appUrn} already has subnet ${existingApp.subnet}`);
      return existingApp.subnet;
    }

    const allocatedSubnets = await this.getAllocatedSubnets();

    const nextSubnet = this.findNextAvailableSubnet(allocatedSubnets);
    if (!nextSubnet) {
      throw new TranslatableError('NETWORK_ERROR_NO_AVAILABLE_SUBNETS');
    }

    await this.appsRepository.updateAppById(existingApp.id, { subnet: nextSubnet });

    this.logger.info(`Allocated subnet ${nextSubnet} for app ${appUrn}`);
    return nextSubnet;
  }

  /**
   * Get all currently allocated subnets
   * @returns Array of subnets in use
   */
  private async getAllocatedSubnets(): Promise<string[]> {
    const apps = await this.appsRepository.getApps();
    return apps
      .filter((app) => app.subnet !== null)
      .map((app) => app.subnet)
      .filter((subnet): subnet is string => subnet !== null);
  }

  /**
   * Find the next available subnet that's not in use
   * @param allocatedSubnets List of subnets already in use
   * @returns The next available subnet or null if all are used
   */
  private findNextAvailableSubnet(allocatedSubnets: string[]): string | null {
    const usedThirdOctets = allocatedSubnets.map((subnet) => {
      const match = subnet.match(/10\.128\.(\d+)\.0\/24/);
      return match?.[1] ? Number.parseInt(match[1], 10) : null;
    });

    let candidate = RESERVED_SUBNET_MAX + 1;

    while (candidate <= MAX_SUBNET_OCTET) {
      if (!usedThirdOctets.includes(candidate)) {
        return `${BASE_SUBNET_PREFIX}.${candidate}.0${SUBNET_MASK}`;
      }
      candidate++;
    }

    return null;
  }
}
