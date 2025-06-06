import { TranslatableError } from '@/common/error/translatable-error';
import { LoggerService } from '@/core/logger/logger.service';
import { Inject, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import Dockerode from 'dockerode';
import { AppsRepository } from '../apps/apps.repository';
import { DOCKERODE } from '../docker/docker.module';

const BASE_SUBNET_PREFIX = '10.128';
const SUBNET_MASK = '/24';

const MAX_RETRIES = 3;
const RESERVED_SUBNET_MAX = 9;
const MAX_SUBNET_OCTET = 254; // Maximum value for the third octet (x in 10.128.x.0/24)

@Injectable()
export class SubnetManagerService {
  constructor(
    private readonly appsRepository: AppsRepository,
    private readonly logger: LoggerService,
    @Inject(DOCKERODE) private docker: Dockerode,
  ) {}

  /**
   * Allocate a subnet for an app
   * @param appUrn The URN of the app to allocate a subnet for
   * @returns The allocated subnet with mask (e.g., 10.128.10.0/24)
   */
  public async allocateSubnet(appUrn: AppUrn, retryCount = 0): Promise<string> {
    const existingApp = await this.appsRepository.getAppByUrn(appUrn);

    if (!existingApp) {
      throw new TranslatableError('APP_ERROR_APP_NOT_FOUND');
    }

    const allocatedSubnets = await this.getAllocatedSubnets();
    const nextSubnet = this.findNextAvailableSubnet(allocatedSubnets);

    if (!nextSubnet) {
      throw new TranslatableError('NETWORK_ERROR_NO_AVAILABLE_SUBNETS');
    }

    try {
      await this.appsRepository.updateAppById(existingApp.id, { subnet: nextSubnet });
    } catch (error) {
      if (error instanceof Error && retryCount < MAX_RETRIES) {
        this.logger.error(`Subnet ${nextSubnet} failed to be allocated, retrying...`);
        return this.allocateSubnet(appUrn, retryCount + 1);
      }
      throw error;
    }

    this.logger.info(`Allocated subnet ${nextSubnet} for app ${appUrn}`);
    return nextSubnet;
  }

  /**
   * Get all currently allocated subnets
   * @returns Array of subnets in use
   */
  private async getAllocatedSubnets(): Promise<string[]> {
    await this.docker.pruneNetworks().catch(() => ({}));
    const networks = await this.docker.listNetworks();
    return networks
      .flatMap((network) => network.IPAM?.Config?.map((c) => c))
      .map((c) => c?.Subnet)
      .filter((c) => c !== undefined);
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
