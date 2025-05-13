import type { Architecture } from '@/common/constants.js';
import { type DynamicCompose, type ServiceInput } from '@runtipi/common/schemas';
import deepmerge from 'deepmerge';

/**
 * Merges architecture-specific overrides with the base configuration
 * @param services The base services from configuration
 * @param overrides The architecture-specific overrides from configuration
 * @param architecture The current system architecture
 * @returns The merged services configuration
 */
export const mergeArchitectureOverrides = (
  services: ServiceInput[],
  overrides: DynamicCompose['overrides'] | undefined,
  architecture: Architecture,
): ServiceInput[] => {
  if (!overrides?.length) {
    return services;
  }

  const architectureOverrides = overrides.find((override) => override.architecture === architecture);

  if (!architectureOverrides) {
    return services;
  }

  const servicesMap = new Map<string, ServiceInput>();
  for (const service of services) {
    servicesMap.set(service.name, service);
  }

  for (const override of architectureOverrides.services) {
    if (!override.name) continue;

    const baseService = servicesMap.get(override.name);
    if (baseService) {
      // Special case for arrays that should be replaced rather than merged
      const arrayMode = {
        arrayMerge: (_target: unknown[], source: unknown[]) => source,
      };

      servicesMap.set(override.name, deepmerge(baseService, override, arrayMode) as ServiceInput);
    }
  }

  return Array.from(servicesMap.values());
};
