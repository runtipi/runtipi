import { TranslatableError } from '@/common/error/translatable-error';
import { DATABASE, type Database } from '@/core/database/database.module';
import { app } from '@/core/database/drizzle/schema';
import { LoggerService } from '@/core/logger/logger.service';
import type { AppUrn } from '@/types/app/app.types';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { AppsRepository } from '../apps/apps.repository';

// Base subnet pattern for app networks
const BASE_SUBNET_PREFIX = '10.128';
const SUBNET_MASK = '/24';

// First few subnets are reserved for system use (0-9)
const RESERVED_SUBNET_MAX = 9;
const MAX_SUBNET_OCTET = 254; // Maximum value for the third octet (x in 10.128.x.0/24)

@Injectable()
export class SubnetManagerService {
  constructor(
    @Inject(DATABASE) private db: Database,
    private readonly appsRepository: AppsRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Allocate a subnet for an app
   * @param
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

    // Get all allocated subnets
    const allocatedSubnets = await this.getAllocatedSubnets();

    // Find the next available subnet
    const nextSubnet = this.findNextAvailableSubnet(allocatedSubnets);
    if (!nextSubnet) {
      throw new TranslatableError('NETWORK_ERROR_NO_AVAILABLE_SUBNETS');
    }

    // Save the allocated subnet to the app
    await this.db.update(app).set({ subnet: nextSubnet }).where(eq(app.id, existingApp.id)).execute();

    this.logger.info(`Allocated subnet ${nextSubnet} for app ${appUrn}`);
    return nextSubnet;
  }

  /**
   * Get all currently allocated subnets
   * @returns Array of subnets in use
   */
  private async getAllocatedSubnets(): Promise<string[]> {
    const result = await this.db.query.app.findMany({
      columns: { subnet: true },
      where: (fields, { isNotNull }) => isNotNull(fields.subnet),
    });

    return result.map((a) => a.subnet).filter(Boolean) as string[];
  }

  /**
   * Find the next available subnet that's not in use
   * @param allocatedSubnets List of subnets already in use
   * @returns The next available subnet or null if all are used
   */
  private findNextAvailableSubnet(allocatedSubnets: string[]): string | null {
    // Extract the third octet from each allocated subnet
    const usedThirdOctets = allocatedSubnets
      .map((subnet) => {
        const match = subnet.match(/10\.128\.(\d+)\.0\/24/);
        return match ? Number.parseInt(match[1], 10) : null;
      })
      .filter(Boolean) as number[];

    // Start with the first non-reserved subnet
    let candidate = RESERVED_SUBNET_MAX + 1;

    // Find the next available third octet
    while (candidate <= MAX_SUBNET_OCTET) {
      if (!usedThirdOctets.includes(candidate)) {
        return `${BASE_SUBNET_PREFIX}.${candidate}.0${SUBNET_MASK}`;
      }
      candidate++;
    }

    // No available subnets
    return null;
  }

  /**
   * Validate a subnet format
   * @param subnet The subnet to validate
   * @returns True if the subnet is valid
   */
  public isValidSubnet(subnet: string): boolean {
    const pattern = /^10\.128\.(\d+)\.0\/24$/;
    const match = subnet.match(pattern);

    if (!match) return false;

    const thirdOctet = Number.parseInt(match[1], 10);
    return thirdOctet >= 0 && thirdOctet <= MAX_SUBNET_OCTET;
  }
}
