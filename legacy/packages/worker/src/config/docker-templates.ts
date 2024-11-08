import { DockerComposeBuilder } from '@/lib/docker/builders/docker-compose-builder';
import { serviceSchema } from '@/lib/docker/builders/schemas';
import { ServiceBuilder } from '@/lib/docker/builders/service-builder';
import { TraefikLabelsBuilder } from '@/lib/docker/builders/traefik-labels-builder';
import type { AppEventFormInput } from '@runtipi/shared';
import type { z } from 'zod';

export type ServiceInput = z.input<typeof serviceSchema>;
export type Service = z.output<typeof serviceSchema>;

const buildService = (params: Service, form: AppEventFormInput) => {
  const service = new ServiceBuilder();
  service
    .setImage(params.image)
    .setName(params.name)
    .setEnvironment(params.environment)
    .setCommand(params.command)
    .setHealthCheck(params.healthCheck)
    .setDependsOn(params.dependsOn)
    .addVolumes(params.volumes)
    .setRestartPolicy('unless-stopped')
    .addExtraHosts(params.extraHosts)
    .addUlimits(params.ulimits)
    .addPorts(params.addPorts)
    .addNetwork('tipi_main_network')
    .setNetworkMode(params.networkMode);

  if (params.isMain) {
    if (!params.internalPort) {
      throw new Error('Main service must have an internal port specified');
    }

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

export const getDockerCompose = (services: ServiceInput[], form: AppEventFormInput) => {
  const myServices = services.map((service) => buildService(serviceSchema.parse(service), form));

  const dockerCompose = new DockerComposeBuilder().addServices(myServices).addNetwork({
    key: 'tipi_main_network',
    name: 'runtipi_tipi_main_network',
    external: true,
  });

  return dockerCompose.build();
};
