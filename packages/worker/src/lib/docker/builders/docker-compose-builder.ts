import * as yaml from 'yaml';
import type { BuiltService } from './service-builder';

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
    services.forEach((service) => this.addService(service));
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
}
