import { TranslatableError } from '@/common/error/translatable-error';
import { LoggerService } from '@/core/logger/logger.service';
import { Inject, Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import Dockerode from 'dockerode';
import { AppsRepository } from '../apps/apps.repository';
import { DOCKERODE } from '../docker/docker.module';

const SUBNET_MASK = '/24';
const MAX_RETRIES = 3;
const STARTING_OCTET_2 = 128;
const MAX_OCTET_VALUE = 254;
const RESERVED_SUBNET_MAX_OCTET_3 = 9;

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
    const appSubnets = (await this.appsRepository.getApps().then((apps) => apps.map((app) => app.subnet))).filter((subnet) => subnet !== null);

    await this.docker.pruneNetworks().catch(() => ({}));
    const networks = await this.docker.listNetworks();
    return networks
      .flatMap((network) => network.IPAM?.Config?.map((c) => c))
      .map((c) => c?.Subnet)
      .filter((c) => c !== undefined)
      .concat(appSubnets);
  }

  /**
   * Find the next available subnet that's not in use
   * @param allocatedSubnets List of subnets already in use
   * @returns The next available subnet or null if all are used
   */
  private findNextAvailableSubnet(allocatedSubnets: string[]): string | null {
    const usedOctetPairs = new Set<string>();
    const subnetRegex = /^10\.(\d{1,3})\.(\d{1,3})\.0\/24$/;

    for (const subnet of allocatedSubnets) {
      const match = subnet.match(subnetRegex);
      if (match) {
        const octet2 = match[1];
        const octet3 = match[2];
        usedOctetPairs.add(`${octet2}.${octet3}`);
      }
    }

    for (let y = STARTING_OCTET_2; y <= MAX_OCTET_VALUE; y++) {
      const startOctet3 = y === STARTING_OCTET_2 ? RESERVED_SUBNET_MAX_OCTET_3 + 1 : 0;

      for (let z = startOctet3; z <= MAX_OCTET_VALUE; z++) {
        const candidatePair = `${y}.${z}`;
        if (!usedOctetPairs.has(candidatePair)) {
          return `10.${y}.${z}.0${SUBNET_MASK}`;
        }
      }
    }

    // All subnets in the 10.128.0.0 - 10.254.254.0 range are exhausted
    return null;
  }
}
