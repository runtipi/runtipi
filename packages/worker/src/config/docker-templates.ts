/* eslint-disable no-template-curly-in-string */
import { AppEventForm } from '@runtipi/shared';
import * as yaml from 'yaml';
import { z } from 'zod';

type GetAppLabelsArgs = {
  internalPort: number;
  appId: string;
  exposedLocal?: boolean;
  exposed?: boolean;
};

const getTraefikLabels = (params: GetAppLabelsArgs) => {
  const { internalPort, appId, exposedLocal, exposed } = params;

  let labels = {
    // General
    generated: true,
    'traefik.enable': false,
    [`traefik.http.middlewares.${appId}-web-redirect.redirectscheme.scheme`]: 'https',
    [`traefik.http.services.${appId}.loadbalancer.server.port`]: `${internalPort}`,
  };

  if (exposed) {
    labels = Object.assign(labels, {
      'traefik.enable': true,
      // HTTP
      [`traefik.http.routers.${appId}-insecure.rule`]: 'Host(`${APP_DOMAIN}`)',
      [`traefik.http.routers.${appId}-insecure.service`]: appId,
      [`traefik.http.routers.${appId}-insecure.middlewares`]: `${appId}-web-redirect`,
      // HTTPS
      [`traefik.http.routers.${appId}.rule`]: 'Host(`${APP_DOMAIN}`)',
      [`traefik.http.routers.${appId}.entrypoints`]: 'websecure',
      [`traefik.http.routers.${appId}.tls.certresolver`]: 'myresolver',
    });
  }

  if (exposedLocal) {
    labels = Object.assign(labels, {
      'traefik.enable': true,
      // HTTP local
      [`traefik.http.routers.${appId}-local-insecure.rule`]: `Host(\`${appId}.\${LOCAL_DOMAIN}\`)`,
      [`traefik.http.routers.${appId}-local-insecure.entrypoints`]: 'web',
      [`traefik.http.routers.${appId}-local-insecure.service`]: appId,
      [`traefik.http.routers.${appId}-local-insecure.middlewares`]: `${appId}-web-redirect`,
      // HTTPS local
      [`traefik.http.routers.${appId}-local.rule`]: `Host(\`${appId}.\${LOCAL_DOMAIN}\`)`,
      [`traefik.http.routers.${appId}-local.entrypoints`]: 'websecure',
      [`traefik.http.routers.${appId}-local.service`]: appId,
      [`traefik.http.routers.${appId}-local.tls`]: true,
    });
  }

  return labels;
};

const dependsOnSchema = z.union([
  z.array(z.string()),
  z.record(
    z.string(),
    z.object({
      condition: z.enum(['service_healthy', 'service_started', 'service_completed_successfully']),
    }),
  ),
]);

const serviceSchema = z
  .object({
    openPort: z.boolean().optional(),
    image: z.string(),
    name: z.string(),
    internalPort: z.number(),
    isMain: z.boolean().optional(),
    command: z.string().optional(),
    volumes: z
      .array(
        z.object({
          hostPath: z.string(),
          containerPath: z.string(),
        }),
      )
      .optional(),
    environment: z.record(z.string()).optional(),
    exposedLocal: z.boolean().optional(),
    exposed: z.boolean().optional(),
    healthCheck: z
      .object({
        test: z.string(),
        interval: z.string(),
        timeout: z.string(),
        retries: z.number(),
      })
      .optional(),
    dependsOn: dependsOnSchema.optional(),
  })
  .transform((data) => {
    const base: Record<string, unknown> = {
      image: data.image,
      container_name: data.name,
      restart: 'unless-stopped',
      networks: ['tipi_main_network'],
      environment: data.environment,
      healthcheck: data.healthCheck,
      command: data.command,
    };

    if (data.isMain && data.openPort) {
      base.ports = [`\${APP_PORT}:${data.internalPort}`];
    }

    if (data.volumes?.length) {
      base.volumes = data.volumes.map(
        ({ hostPath, containerPath }) => `${hostPath}:${containerPath}`,
      );
    }

    if (data.dependsOn) {
      base.depends_on = data.dependsOn;
    }

    if (data.isMain) {
      base.labels = getTraefikLabels({
        internalPort: data.internalPort,
        appId: data.name,
        exposedLocal: data.exposedLocal,
        exposed: data.exposed,
      });
    }

    return base;
  });

export type ServiceInput = z.input<typeof serviceSchema>;

const getService = (params: ServiceInput) => {
  return serviceSchema.parse(params);
};

export const getDockerCompose = (services: ServiceInput[], form: AppEventForm) => {
  // Format services with provided form data (add exposed field to main service)
  const formattedServices = services.map((service) => {
    if (service.isMain) {
      return Object.assign(service, {
        exposed: form.exposed,
        exposedLocal: form.exposedLocal,
        openPort: form.openPort,
      });
    }
    return service;
  });

  return yaml.stringify({
    services: formattedServices.reduce(
      (acc, service) => {
        acc[service.name] = getService(service);
        return acc;
      },
      {} as Record<string, unknown>,
    ),
    networks: {
      tipi_main_network: {
        name: 'runtipi_tipi_main_network',
        external: true,
      },
    },
  });
};
