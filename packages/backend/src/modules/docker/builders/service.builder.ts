import type { z } from 'zod';
import type { DependsOn, serviceSchema } from './schemas';

interface ServicePort {
  containerPort: number;
  hostPort: number | string;
  tcp?: boolean;
  udp?: boolean;
  interface?: string;
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

interface Deploy {
  resources: {
    limits?: {
      cpus?: string;
      memory?: string;
      pids?: number;
    };
    reservations?: {
      cpus?: string;
      memory?: string;
      devices?: {
        capabilities: string[];
        driver?: string;
        count?: 'all' | number;
        deviceIds?: string[];
      }[];
    };
  };
}

interface Logging {
  driver: string;
  options: Record<string, string>;
}

export interface BuilderService {
  image: string;
  containerName: string;
  restart: 'always' | 'unless-stopped' | 'on-failure';
  environment?: Record<string, string | number>;
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
  capAdd?: string[];
  deploy?: Deploy;
  hostname?: string;
  devices?: string[];
  entrypoint?: string | string[];
  pid?: string;
  privileged?: boolean;
  tty?: boolean;
  user?: string;
  workingDir?: string;
  shmSize?: string;
  capDrop?: string[];
  logging?: Logging;
  readOnly?: boolean;
  securityOpt?: string[];
  stopSignal?: string;
  stopGracePeriod?: string;
  stdinOpen?: boolean;
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
  setNetwork(network: string) {
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
  setPort(port?: ServicePort) {
    if (!port) {
      return this;
    }

    if (!this.service.ports) {
      this.service.ports = [];
    }

    let port_string = `${port.hostPort}:${port.containerPort}`;

    if (port.interface) {
      port_string = `${port.interface}:${port_string}`;
    }

    if (!port.tcp && !port.udp) {
      this.service.ports.push(port_string);
      return this;
    }

    if (port.tcp) {
      this.service.ports.push(`${port_string}/tcp`);
    }

    if (port.udp) {
      this.service.ports.push(`${port_string}/udp`);
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
  setPorts(ports?: ServicePort[]) {
    if (ports) {
      for (const port of ports) {
        this.setPort(port);
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
  setVolume(volume: ServiceVolume) {
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
  setVolumes(volumes?: ServiceVolume[]) {
    if (volumes && volumes.length > 0) {
      for (const volume of volumes) {
        this.setVolume(volume);
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
  setEnvironment(environment?: Record<string, string | number>) {
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
   * Sets the health check for the service.
   * @param {HealthCheck} healthCheck The health check to set for the service.
   * @example
   * ```typescript
   * const service = new ServiceBuilder();
   * service.setHealthCheck({
   *    test: 'curl --fail http://localhost:3000 || exit 1',
   *    retries: 3,
   *    interval: '30s',
   *    timeout: '10s',
   * });
   *  ```
   */
  setHealthCheck(healthCheck?: z.infer<typeof serviceSchema>['healthCheck']) {
    if (healthCheck) {
      this.service.healthCheck = {
        test: healthCheck.test,
        interval: healthCheck.interval,
        timeout: healthCheck.timeout,
        retries: healthCheck.retries,
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

  setExtraHosts(extraHosts?: string[]) {
    if (!extraHosts) {
      return this;
    }

    this.service.extraHosts = extraHosts;
    return this;
  }

  setUlimits(ulimits?: Ulimits) {
    if (!ulimits) {
      return this;
    }

    this.service.ulimits = ulimits;
    return this;
  }

  setCapAdd(cap?: string[]) {
    this.service.capAdd = cap;
    return this;
  }

  setDeploy(deploy?: Deploy) {
    this.service.deploy = deploy;
    return this;
  }

  setHostname(hostname?: string) {
    this.service.hostname = hostname;
    return this;
  }

  setDevices(devices?: string[]) {
    this.service.devices = devices;
    return this;
  }

  setEntrypoint(entrypoint?: string | string[]) {
    this.service.entrypoint = entrypoint;
    return this;
  }

  setPid(pid?: string) {
    this.service.pid = pid;
    return this;
  }

  setPrivileged(privileged?: boolean) {
    this.service.privileged = privileged;
    return this;
  }

  setTty(tty?: boolean) {
    this.service.tty = tty;
    return this;
  }

  setUser(user?: string) {
    this.service.user = user;
    return this;
  }

  setWorkingDir(workingDir?: string) {
    this.service.workingDir = workingDir;
    return this;
  }

  setShmSize(shmSize?: string) {
    this.service.shmSize = shmSize;
    return this;
  }

  setCapDrop(capDrop?: string[]) {
    this.service.capDrop = capDrop;
    return this;
  }

  setLogging(logging?: Logging) {
    this.service.logging = logging;
    return this;
  }

  setReadOnly(readOnly?: boolean) {
    this.service.readOnly = readOnly;
    return this;
  }

  setSecurityOpt(securityOpt?: string[]) {
    this.service.securityOpt = securityOpt;
    return this;
  }

  setStopSignal(stopSignal?: string) {
    this.service.stopSignal = stopSignal;
    return this;
  }

  setStopGracePeriod(stopGracePeriod?: string) {
    this.service.stopGracePeriod = stopGracePeriod;
    return this;
  }

  setStdinOpen(stdinOpen?: boolean) {
    this.service.stdinOpen = stdinOpen;
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

    const finalService = {
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
      cap_add: this.service.capAdd,
      deploy: this.service.deploy,
      hostname: this.service.hostname,
      devices: this.service.devices,
      entrypoint: this.service.entrypoint,
      pid: this.service.pid,
      privileged: this.service.privileged,
      tty: this.service.tty,
      user: this.service.user,
      working_dir: this.service.workingDir,
      shm_size: this.service.shmSize,
      cap_drop: this.service.capDrop,
      logging: this.service.logging,
      read_only: this.service.readOnly,
      security_opt: this.service.securityOpt,
      stop_signal: this.service.stopSignal,
      stop_grace_period: this.service.stopGracePeriod,
      stdin_open: this.service.stdinOpen,
    };

    // Delete any undefined properties
    for (const key in finalService) {
      if (finalService[key as keyof typeof finalService] === undefined) {
        delete finalService[key as keyof typeof finalService];
      }
    }

    return finalService;
  }
}
