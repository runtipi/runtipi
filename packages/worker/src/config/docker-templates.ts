import { DockerComposeBuilder } from '@/lib/docker/builders/docker-compose-builder';
import { ServiceBuilder } from '@/lib/docker/builders/service-builder';
import { TraefikLabelsBuilder } from '@/lib/docker/builders/traefik-labels-builder';
import { AppEventForm } from '@runtipi/shared';
import { z } from 'zod';

const dependsOnSchema = z.union([
  z.array(z.string()),
  z.record(
    z.string(),
    z.object({
      condition: z.enum(['service_healthy', 'service_started', 'service_completed_successfully']),
    }),
  ),
]);

export type DependsOn = z.output<typeof dependsOnSchema>;

const serviceSchema = z.object({
  image: z.string(),
  name: z.string(),
  internalPort: z.number(),
  isMain: z.boolean().optional(),
  addPorts: z
    .array(
      z.object({
        containerPort: z.number(),
        hostPort: z.number(),
        udp: z.boolean().optional(),
        tcp: z.boolean().optional(),
      }),
    )
    .optional(),
  command: z.string().optional(),
  volumes: z
    .array(
      z.object({
        hostPath: z.string(),
        containerPath: z.string(),
        readOnly: z.boolean().optional(),
      }),
    )
    .optional(),
  environment: z.record(z.string()).optional(),
  healthCheck: z
    .object({
      test: z.string(),
      interval: z.string(),
      timeout: z.string(),
      retries: z.number(),
    })
    .optional(),
  dependsOn: dependsOnSchema.optional(),
});

export type ServiceInput = z.input<typeof serviceSchema>;
export type Service = z.output<typeof serviceSchema>;

const buildService = (params: Service, form: AppEventForm) => {
  const service = new ServiceBuilder();
  service
    .setImage(params.image)
    .setName(params.name)
    .setEnvironment(params.environment)
    .setCommand(params.command)
    .setHealthCheck(params.healthCheck)
    .setDependsOn(params.dependsOn)
    .addPorts(params.addPorts)
    .addVolumes(params.volumes)
    .setRestartPolicy('unless-stopped')
    .addNetwork('tipi_main_network');

  if (params.isMain) {
    if (form.openPort) {
      service.addPort({
        containerPort: params.internalPort,
        hostPort: '${APP_PORT}',
      });
    }

    const traefikLabels = new TraefikLabelsBuilder({
      internalPort: params.internalPort,
      appId: params.name,
      exposedLocal: form.exposedLocal,
      exposed: form.exposed,
    })
      .addExposedLabels()
      .addExposedLocalLabels();

    service.setLabels(traefikLabels.build());
  }

  return service.build();
};

export const getDockerCompose = (services: ServiceInput[], form: AppEventForm) => {
  const myServices = services.map((service) => buildService(serviceSchema.parse(service), form));

  const dockerCompose = new DockerComposeBuilder().addServices(myServices).addNetwork({
    key: 'tipi_main_network',
    name: 'runtipi_tipi_main_network',
    external: true,
  });

  return dockerCompose.build();
};
