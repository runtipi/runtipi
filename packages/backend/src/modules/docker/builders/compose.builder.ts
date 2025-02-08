import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import * as yaml from 'yaml';
import { type Service, type ServiceInput, serviceSchema } from './schemas';
import { type BuiltService, ServiceBuilder } from './service.builder';
import { TraefikLabelsBuilder } from './traefik-labels.builder';

interface Network {
  key?: string;
  name: string;
  external: boolean;
}

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
    const hasNetworks = Object.keys(this.networks).length > 0;

    return yaml.stringify({
      services: this.services,
      networks: hasNetworks ? this.networks : undefined,
    });
  }

  public getDockerCompose = (services: ServiceInput[], form: AppEventFormInput) => {
    const myServices = services.map((service) => this.buildService(service, form));

    const dockerCompose = new DockerComposeBuilder().addServices(myServices).addNetwork({
      key: 'tipi_main_network',
      name: 'runtipi_tipi_main_network',
      external: true,
    });

    return dockerCompose.build();
  };

  private buildService = (params: Service, form: AppEventFormInput) => {
    const result = serviceSchema.safeParse(params);

    if (!result.success) {
      console.warn(`! Service ${params.name} has invalid schema: \n${JSON.stringify(result.error.flatten(), null, 2)}\nNotify the app maintainer`);
    }

    const service = new ServiceBuilder();
    service
      .setImage(params.image)
      .setName(params.name)
      .setEnvironment(params.environment)
      .setCommand(params.command)
      .setHealthCheck(params.healthCheck)
      .setDependsOn(params.dependsOn)
      .setVolumes(params.volumes)
      .setRestartPolicy('unless-stopped')
      .setExtraHosts(params.extraHosts)
      .setUlimits(params.ulimits)
      .setPorts(params.addPorts)
      .setNetwork('tipi_main_network')
      .setNetworkMode(params.networkMode)
      .setCapAdd(params.capAdd)
      .setDeploy(params.deploy)
      .setHostname(params.hostname)
      .setDevices(params.devices)
      .setEntrypoint(params.entrypoint)
      .setPid(params.pid)
      .setPrivileged(params.privileged)
      .setTty(params.tty)
      .setUser(params.user)
      .setWorkingDir(params.workingDir)
      .setShmSize(params.shmSize)
      .setCapDrop(params.capDrop)
      .setLogging(params.logging)
      .setReadOnly(params.readOnly)
      .setSecurityOpt(params.securityOpt)
      .setStopSignal(params.stopSignal)
      .setStopGracePeriod(params.stopGracePeriod)
      .setStdinOpen(params.stdinOpen);

    if (params.isMain) {
      if (form.openPort && params.internalPort) {
        service.setPort({
          containerPort: params.internalPort,
          hostPort: '${APP_PORT}',
        });
      }

      if (params.internalPort) {
        const traefikLabels = new TraefikLabelsBuilder({
          internalPort: params.internalPort,
          appId: params.name,
          exposedLocal: form.exposedLocal,
          exposed: form.exposed,
          enableAuth: form.enableAuth,
        })
          .addExposedLabels()
          .addExposedLocalLabels();

        service.setLabels(traefikLabels.build());
      }
    }

    return service.build();
  };
}
