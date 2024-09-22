import type { DependsOn, serviceSchema } from './schemas';

interface ServicePort {
  containerPort: number;
  hostPort: number | string;
  tcp?: boolean;
  udp?: boolean;
}

interface ServiceVolume {
  hostPath: string;
  containerPath: string;
  readOnly?: boolean;
}

interface HealthCheck {
  test: string;
  interval?: string;
  timeout?: string;
  retries?: number;
  start_interval?: string;
  start_period?: string;
}

interface Ulimits {
  nproc: number | { soft: number; hard: number };
  nofile: number | { soft: number; hard: number };
}

export interface BuilderService {
  image: string;
  containerName: string;
  restart: 'always' | 'unless-stopped' | 'on-failure';
  environment?: Record<string, string>;
  command?: string | string[];
  volumes?: string[];
  ports?: string[];
  healthCheck?: HealthCheck;
  labels?: Record<string, string | boolean>;
  dependsOn?: DependsOn;
  networks?: string[];
  networkMode?: string;
  extraHosts?: string[];
  ulimits?: Ulimits;
}

export type BuiltService = ReturnType<typeof ServiceBuilder.prototype.build>;

/**
 * This class is a builder for the service object in the docker-compose file.
 */
export class ServiceBuilder {
  private service: Partial<BuilderService> = {};

  /**
   * Sets the image for the service.
   * @param image The image to use for the service.
   *
   * @example
   * ```typescript
   * const service = new ServiceBuilder();
   * service.setImage('nginx:latest');
   * ```
   */
  setImage(image: string) {
    this.service.image = image;
    return this;
  }

  /**
   * Sets the name of the container. Will be used as the `container_name` property as well as the key
   * @param name The name of the container.
   *
   * @example
   * ```typescript
   * const service = new ServiceBuilder();
   * service.setName('nginx-container');
   * ```
   */
  setName(name: string) {
    this.service.containerName = name;
    return this;
  }

  /**
   * Sets the restart policy for the service.
   * @param {string} policy The restart policy for the service. Can be one of ['always', 'unless-stopped', 'on-failure']
   * @example
   * ```typescript
   * const service = new ServiceBuilder();
   * service.setRestartPolicy('always');
   * ```
   */
  setRestartPolicy(policy: 'always' | 'unless-stopped' | 'on-failure') {
    this.service.restart = policy;
    return this;
  }

  /**
   * Adds a network to the service.
   * @param {string} network The network to add to the service.
   * @example
   * ```typescript
   * const service = new ServiceBuilder();
   * service.addNetwork('tipi_main_network');
   * ```
   */
  addNetwork(network: string) {
    this.service.networks = [network];
    return this;
  }

  /**
   * Adds a port to the service.
   *
   * @param {ServicePort} port The port to add to the service.
   * @example
   * ```typescript
   * const service = new ServiceBuilder();
   * service.addPort({ containerPort: 80, hostPort: 8080 });
   */
  addPort(port?: ServicePort) {
    if (!port) {
      return this;
    }

    if (!this.service.ports) {
      this.service.ports = [];
    }

    if (!port.tcp && !port.udp) {
      this.service.ports.push(`${port.hostPort}:${port.containerPort}`);
      return this;
    }

    if (port.tcp) {
      this.service.ports.push(`${port.hostPort}:${port.containerPort}/tcp`);
    }

    if (port.udp) {
      this.service.ports.push(`${port.hostPort}:${port.containerPort}/udp`);
    }

    return this;
  }

  /**
   * Adds multiple ports to the service.
   *
   * @param {ServicePort[]} ports The ports to add to the service.
   * @example
   * ```typescript
   * const service = new ServiceBuilder();
   * service.addPorts([
   *   { containerPort: 80, hostPort: 8080 },
   *   { containerPort: 443, hostPort: 8443, tcp: true },
   * ]);
   */
  addPorts(ports?: ServicePort[]) {
    if (ports) {
      for (const port of ports) {
        this.addPort(port);
      }
    }
    return this;
  }

  /**
   * Adds a volume to the service.
   * @param {ServiceVolume} volume The volume to add to the service.
   * @example
   * ```typescript
   * const service = new ServiceBuilder();
   * service.addVolume({ hostPath: '/path/to/host', containerPath: '/path/to/container' });
   * ```
   */
  addVolume(volume: ServiceVolume) {
    if (!this.service.volumes) {
      this.service.volumes = [];
    }

    const readOnly = volume.readOnly ? ':ro' : '';
    this.service.volumes.push(`${volume.hostPath}:${volume.containerPath}${readOnly}`);
    return this;
  }

  /**
   * Adds multiple volumes to the service.
   * @param {ServiceVolume[]} volumes The volumes to add to the service.
   * @example
   * ```typescript
   * const service = new ServiceBuilder();
   * service.addVolumes([
   *   { hostPath: '/path/to/host', containerPath: '/path/to/container' },
   *   { hostPath: '/path/to/host2', containerPath: '/path/to/container2', readOnly: true },
   * ]);
   * ```
   */
  addVolumes(volumes?: ServiceVolume[]) {
    if (volumes && volumes.length > 0) {
      for (const volume of volumes) {
        this.addVolume(volume);
      }
    }
    return this;
  }

  /**
   * Sets the environment variables for the service.
   * @param {Record<string, string>} environment The environment variables to set for the service.
   * @example
   * ```typescript
   * const service = new ServiceBuilder();
   * service.setEnvironment({ key: 'value' });
   * ```
   */
  setEnvironment(environment?: Record<string, string>) {
    if (environment) {
      this.service.environment = { ...this.service.environment, ...environment };
    }
    return this;
  }

  /**
   * Sets the command for the service.
   * @param {string} command The command to run in the service.
   * @example
   * ```typescript
   * const service = new ServiceBuilder();
   * service.setCommand('npm run start');
   * ```
   */
  setCommand(command?: string | string[]) {
    if (command) {
      this.service.command = command;
    }

    return this;
  }

  /**
   * Adds the health check for the service.
   * @param {HealthCheck} healthCheck The health check to add for the service.
   * @example
   * ```typescript
   * const service = new ServiceBuilder();
   * service.addHealthCheck({
   *    test: 'curl --fail http://localhost:3000 || exit 1',
   *    retries: 3,
   *    interval: '30s',
   *    timeout: '10s',
   * });
   *  ```
   */
  addHealthCheck(healthCheck?: typeof serviceSchema._type.healthCheck) {
    if (healthCheck) {
      this.service.healthCheck = {
        test: healthCheck.test,
        retries: healthCheck.retries,
        interval: healthCheck.interval,
        timeout: healthCheck.timeout,
        start_interval: healthCheck.startInterval,
        start_period: healthCheck.startPeriod,
      };
    }

    return this;
  }

  /**
   * Sets the labels for the service.
   * @param {Record<string, string | boolean>} labels The labels to set for the service.
   * @example
   * ```typescript
   * const service = new ServiceBuilder();
   * service.setLabels({ key: 'value' });
   * ```
   */
  setLabels(labels: Record<string, string | boolean>) {
    if (labels) {
      this.service.labels = { ...this.service.labels, ...labels };
    }
    return this;
  }

  /**
   * Sets the depends on for the service.
   * @param {DependsOn} dependsOn The depends on to set for the service.
   * @example
   * ```typescript
   * const service = new ServiceBuilder();
   * service.setDependsOn({
   *    serviceName: {
   *      condition: 'service_healthy',
   *    }
   * });
   * ```
   */
  setDependsOn(dependsOn?: DependsOn) {
    if (!dependsOn) {
      return this;
    }

    this.service.dependsOn = dependsOn;
    return this;
  }

  setNetworkMode(networkMode?: string) {
    if (!networkMode) {
      return this;
    }

    this.service.networkMode = networkMode;

    return this;
  }

  addExtraHosts(extraHosts?: string[]) {
    if (!extraHosts) {
      return this;
    }

    this.service.extraHosts = extraHosts;
    return this;
  }

  addUlimits(ulimits?: Ulimits) {
    if (!ulimits) {
      return this;
    }

    this.service.ulimits = ulimits;
    return this;
  }

  /**
   * Builds the service object.
   * @returns The built service object.
   * @example
   * ```typescript
   * const service = new ServiceBuilder();
   * service.setImage('nginx:latest')
   *  .setName('nginx-container')
   *  .setRestartPolicy('always')
   *  .addNetwork('tipi_main_network')
   *  .build();
   *  ```
   */
  build() {
    if (!this.service.containerName || !this.service.image) {
      throw new Error('Service name and image are required');
    }

    if (this.service.networkMode) {
      this.service.ports = undefined;
      this.service.networks = undefined;
    }

    return {
      image: this.service.image,
      command: this.service.command,
      container_name: this.service.containerName,
      restart: this.service.restart,
      networks: this.service.networks,
      network_mode: this.service.networkMode,
      extra_hosts: this.service.extraHosts,
      ulimits: this.service.ulimits,
      healthcheck: this.service.healthCheck,
      environment: this.service.environment,
      ports: this.service.ports,
      volumes: this.service.volumes,
      depends_on: this.service.dependsOn,
      labels: this.service.labels,
    };
  }
}
