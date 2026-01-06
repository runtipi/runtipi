import { extractAppUrn } from '@/common/helpers/app-helpers';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import { type DynamicComposeSchemaYaml, type XRuntipiServiceParams } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';
import deepmerge from 'deepmerge';
import * as yaml from 'yaml';
import { TraefikLabelsBuilder } from './traefik-labels.builder';

/**
 * Interpolate {{RUNTIPI_APP_ID}} placeholders in labels with the actual app ID
 */
const interpolateLabels = (labels: Record<string, string | number | boolean>, appId: string): Record<string, string | number | boolean> => {
  const interpolated: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(labels)) {
    const interpolatedKey = key.replace(/\{\{\s*RUNTIPI_APP_ID\s*\}\}/g, appId);
    const interpolatedValue = typeof value === 'string' ? value.replace(/\{\{\s*RUNTIPI_APP_ID\s*\}\}/g, appId) : value;

    interpolated[interpolatedKey] = interpolatedValue;
  }

  return interpolated;
};

/**
 * Normalize labels to a record format
 */
const normalizeLabels = (labels: unknown): Record<string, string | number | boolean> => {
  if (!labels) return {};
  if (Array.isArray(labels)) {
    const normalized: Record<string, string | number | boolean> = {};
    for (const label of labels) {
      const [key, ...valueParts] = label.split('=');
      normalized[key] = valueParts.join('=');
    }
    return normalized;
  }

  return labels as Record<string, string | number | boolean>;
};

/**
 * Normalize networks to a record format
 */
const normalizeNetworks = (networks: unknown) => {
  if (!networks) return {};
  if (Array.isArray(networks)) {
    const normalized: { [key: string]: unknown } = {};

    for (const net of networks) {
      normalized[net] = {};
    }

    return normalized;
  }

  return networks as NormalizedComposeService['networks'];
};

/**
 * Normalize ports to a string array format
 */
const normalizePorts = (ports: unknown) => {
  if (!ports) return undefined;
  if (Array.isArray(ports)) {
    return ports.map((port) => {
      if (typeof port === 'string') return port;
      if (typeof port === 'object' && port !== null) {
        // Handle long syntax: { target: 80, published: 8080, protocol: 'tcp' }
        const { target, published, protocol } = port;
        return `${published}:${target}${protocol ? `/${protocol}` : ''}`;
      }
      return String(port);
    });
  }
  return [];
};

type NormalizedComposeService = DynamicComposeSchemaYaml['services'][string] & {
  networks: { [key: string]: { gw_priority?: number } };
  ports: string[];
  labels: Record<string, string | number | boolean>;
};

export class DockerComposeBuilder {
  private buildService = (service: DynamicComposeSchemaYaml['services'][string], form: AppEventFormInput, appUrn: AppUrn) => {
    const { appName, appStoreId } = extractAppUrn(appUrn);

    const serviceCopy = { ...service };
    serviceCopy.networks = normalizeNetworks(serviceCopy.networks);
    serviceCopy.ports = normalizePorts(serviceCopy.ports);
    serviceCopy.labels = normalizeLabels(serviceCopy.labels);

    const xruntipiParams = service['x-runtipi'] || ({} as XRuntipiServiceParams);

    if (service.network_mode) {
      serviceCopy.networks = {} as NormalizedComposeService['networks'];
      serviceCopy.ports = [];
    } else {
      serviceCopy.networks[`${appName}_${appStoreId}_network`] = {
        gw_priority: 0,
      };
      if (xruntipiParams.is_main || xruntipiParams.add_to_main_network) {
        serviceCopy.networks.tipi_main_network = {
          gw_priority: 1,
        };
      }
    }

    if (xruntipiParams.is_main) {
      if (form.openPort && xruntipiParams.internal_port) {
        serviceCopy.ports = serviceCopy.ports || [];
        serviceCopy.ports.push(`\${APP_PORT}:${xruntipiParams.internal_port}`);
      }

      if (xruntipiParams.internal_port && service.network_mode === undefined && (form.exposed || form.exposedLocal)) {
        const traefikLabels = new TraefikLabelsBuilder({
          storeId: appStoreId,
          appId: appName,
          internalPort: xruntipiParams.internal_port,
          exposedLocal: form.exposedLocal,
          exposed: form.exposed,
          enableAuth: form.enableAuth,
          localSubdomain: form.localSubdomain,
        })
          .addExposedLabels()
          .addExposedLocalLabels();

        serviceCopy.labels = { ...serviceCopy.labels, ...traefikLabels.build() };
      }
    }

    serviceCopy.labels = { ...serviceCopy.labels, 'runtipi.managed': 'true', 'runtipi.appurn': appUrn };

    if (!service.restart) {
      serviceCopy.restart = 'unless-stopped';
    }

    return serviceCopy as NormalizedComposeService;
  };

  public getDockerCompose = (input: DynamicComposeSchemaYaml, form: AppEventFormInput, appUrn: AppUrn, subnet: string, architecture?: string) => {
    const { appName, appStoreId } = extractAppUrn(appUrn);
    const appId = `${appName}-${appStoreId}`;

    const inputCopy = JSON.parse(JSON.stringify(input)) as DynamicComposeSchemaYaml;

    // Merge architecture-specific overrides
    if (architecture && inputCopy['x-runtipi']?.overrides) {
      const architectureOverrides = inputCopy['x-runtipi'].overrides.find((o) => o.architecture === architecture);
      if (architectureOverrides) {
        for (const [serviceName, overrideService] of Object.entries(architectureOverrides.services)) {
          if (inputCopy.services[serviceName]) {
            const arrayMode = {
              arrayMerge: (_target: unknown[], source: unknown[]) => source,
            };
            inputCopy.services[serviceName] = deepmerge(inputCopy.services[serviceName], overrideService, arrayMode);
          } else {
            inputCopy.services[serviceName] = overrideService;
          }
        }
      }
    }

    for (const serviceName in inputCopy.services) {
      const service = inputCopy.services[serviceName];
      if (!service) continue;

      const built = this.buildService(service, form, appUrn);

      if (built.labels) {
        built.labels = interpolateLabels(built.labels, appId);
      }

      inputCopy.services[serviceName] = built;
      delete inputCopy.services[serviceName]?.['x-runtipi'];
    }

    // @ts-expect-error - not needed in the generated compose file
    delete inputCopy['x-runtipi'];

    inputCopy.networks = inputCopy.networks || {};
    inputCopy.networks.tipi_main_network = {
      name: 'runtipi_tipi_main_network',
      external: true,
    };
    inputCopy.networks[`${appName}_${appStoreId}_network`] = {
      ipam: {
        config: [{ subnet }],
      },
    };

    const header = ['# This file is auto-generated by runtipi.', '# Do not edit this file manually. Any changes will be overwritten.', '', ''].join(
      '\n',
    );

    return header + yaml.stringify(inputCopy);
  };
}
