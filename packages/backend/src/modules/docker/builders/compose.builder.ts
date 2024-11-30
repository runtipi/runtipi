import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import { Injectable } from '@nestjs/common';
import * as yaml from 'yaml';
import { type Service, type ServiceInput, serviceSchema } from './schemas';
import { type BuiltService, ServiceBuilder } from './service.builder';
import { TraefikLabelsBuilder } from './traefik-labels.builder';

interface Network {
  key?: string;
  name: string;
  external: boolean;
}

@Injectable()
export class DockerComposeBuilder {
  private services: Record<string, BuiltService> = {};
  private networks: Record<string, Network> = {};

  addService(service: BuiltService) {
    this.services[service.container_name] = service;
    return this;
  }

  addServices(services: BuiltService[]) {
    for (const service of services) {
      this.addService(service);
    }
    return this;
  }

  addNetwork(network: Network) {
    this.networks[network.key || network.name] = {
      name: network.name,
      external: network.external,
    };
    return this;
  }

  build() {
    return yaml.stringify({
      services: this.services,
      networks: this.networks,
    });
  }

  public getDockerCompose = (services: ServiceInput[], form: AppEventFormInput) => {
    const myServices = services.map((service) => this.buildService(serviceSchema.parse(service), form));

    const dockerCompose = this.addServices(myServices).addNetwork({
      key: 'tipi_main_network',
      name: 'runtipi_tipi_main_network',
      external: true,
    });

    return dockerCompose.build();
  };

  private buildService = (params: Service, form: AppEventFormInput) => {
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
}
