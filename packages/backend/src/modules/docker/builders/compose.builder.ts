import { extractAppUrn } from '@/common/helpers/app-helpers';
import type { AppEventFormInput } from '@/modules/queue/entities/app-events';
import { type Service, type ServiceInput, serviceSchema } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';
import * as yaml from 'yaml';
import { type BuiltService, ServiceBuilder } from './service.builder';
import { TraefikLabelsBuilder } from './traefik-labels.builder';

interface Network {
  key: string;
  name?: string;
  external: boolean;
  subnet?: string;
  ipam?: {
    config: {
      subnet: string;
    }[];
  };
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
    const networkConfig: Omit<Network, 'key'> = {
      name: network.name,
      external: network.external,
    };

    if (network.subnet) {
      networkConfig.ipam = {
        config: [{ subnet: network.subnet }],
      };
    }

    this.networks[network.key] = networkConfig;
    return this;
  }

  build() {
    const hasNetworks = Object.keys(this.networks).length > 0;

    return yaml.stringify({
      services: this.services,
      networks: hasNetworks ? this.networks : undefined,
    });
  }

  private buildService = (params: Service, form: AppEventFormInput, appUrn: AppUrn) => {
    const { appName, appStoreId } = extractAppUrn(appUrn);
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
      .setSysctls(params.sysctls)
      .setNetwork(`${appName}_${appStoreId}_network`);

    if (params.isMain || params.addToMainNetwork) {
      service.setNetwork('tipi_main_network', 1);
    }

    if (params.isMain) {
      if (form.openPort && params.internalPort) {
        service.setPort({
          containerPort: params.internalPort,
          hostPort: '${APP_PORT}',
        });
      }

      if (params.internalPort && params.networkMode === undefined && (form.exposed || form.exposedLocal)) {
        const traefikLabels = new TraefikLabelsBuilder({
          storeId: appStoreId,
          appId: appName,
          internalPort: params.internalPort,
          exposedLocal: form.exposedLocal,
          exposed: form.exposed,
          enableAuth: form.enableAuth,
          localSubdomain: form.localSubdomain,
        })
          .addExposedLabels()
          .addExposedLocalLabels();

        service.setLabels(traefikLabels.build());
      }
    }

    service.setLabels({ 'runtipi.managed': true, 'runtipi.appurn': appUrn, ...params.extraLabels }).interpolateVariables(`${appName}-${appStoreId}`);

    return service.build();
  };

  public getDockerCompose = (services: ServiceInput[], form: AppEventFormInput, appUrn: AppUrn, subnet: string) => {
    const { appName, appStoreId } = extractAppUrn(appUrn);

    const myServices = services.map((service) => this.buildService(service, form, appUrn));

    const dockerCompose = this.addServices(myServices)
      .addNetwork({
        key: 'tipi_main_network',
        name: 'runtipi_tipi_main_network',
        external: true,
      })
      .addNetwork({
        key: `${appName}_${appStoreId}_network`,
        external: false,
        subnet,
      });

    return dockerCompose.build();
  };
}
