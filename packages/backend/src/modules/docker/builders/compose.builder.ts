import { extractAppUrn } from '@/common/helpers/app-helpers';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import type { AppUrn } from '@/types/app/app.types';
import * as yaml from 'yaml';
import { type Service, type ServiceInput, serviceSchema } from './schemas';
import { type BuiltService, ServiceBuilder } from './service.builder';
import { TraefikLabelsBuilder } from './traefik-labels.builder';

interface Network {
  key: string;
  name?: string;
  external: boolean;
  gw_priority?: number;
}

export class DockerComposeBuilder {
  private services: Record<string, BuiltService> = {};
  private networks: Record<string, Omit<Network, 'key'>> = {};

  addService(service: BuiltService) {
    const { name, ...rest } = service;
    this.services[service.name] = rest as BuiltService;
    return this;
  }

  private addServices(services: BuiltService[]) {
    for (const service of services) {
      this.addService(service);
    }
    return this;
  }

  addNetwork(network: Network) {
    this.networks[network.key] = {
      name: network.name,
      external: network.external,
      gw_priority: network.gw_priority,
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

  private buildService = (params: Service, form: AppEventFormInput, appName: string, storeId: string) => {
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
      .setStdinOpen(params.stdinOpen)
      .setNetwork(`${appName}_${storeId}_network`);

    if (params.isMain || params.addToMainNetwork) {
      service.setNetwork('tipi_main_network');
    }

    if (params.isMain) {
      service.setName(`${params.name}_${storeId}`);

      if (form.openPort && params.internalPort) {
        service.setPort({
          containerPort: params.internalPort,
          hostPort: '${APP_PORT}',
        });
      }

      if (params.internalPort) {
        const traefikLabels = new TraefikLabelsBuilder({
          storeId,
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

  public getDockerCompose = (services: ServiceInput[], form: AppEventFormInput, appUrn: AppUrn) => {
    const { appName, appStoreId } = extractAppUrn(appUrn);
    const myServices = services.map((service) => this.buildService(service, form, appName, appStoreId));

    const dockerCompose = this.addServices(myServices)
      .addNetwork({
        key: 'tipi_main_network',
        name: 'runtipi_tipi_main_network',
        external: true,
        gw_priority: 1,
      })
      .addNetwork({
        key: `${appName}_${appStoreId}_network`,
        external: false,
      });

    return dockerCompose.build();
  };
}
