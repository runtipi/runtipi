import { beforeEach, describe, expect, it } from 'vitest';
import { DockerComposeBuilder } from '../compose.builder';
import type { ServiceInput } from '../schemas';
import { ServiceBuilder } from '../service.builder';

describe('DockerComposeBuilder', () => {
  let composeBuilder: DockerComposeBuilder;
  let serviceBuilder: ServiceBuilder;

  beforeEach(() => {
    composeBuilder = new DockerComposeBuilder();
    serviceBuilder = new ServiceBuilder();
  });

  it('should build a docker-compose file', () => {
    const serviceName = 'service';
    const service: ServiceInput = {
      name: serviceName,
      image: 'image',
    };

    const compose = composeBuilder.getDockerCompose([service], {}, 'test');
    expect(compose).toMatchSnapshot();
  });

  it('should correctly format deploy resources', () => {
    const service: ServiceInput = {
      name: 'service',
      image: 'image',
      deploy: {
        resources: {
          limits: { cpus: '0.50', memory: '50M', pids: 1 },
          reservations: { cpus: '0.25', memory: '20M', devices: [{ capabilities: ['gpu'], driver: 'nvidia', count: 'all' }] },
        },
      },
    };

    const compose = composeBuilder.getDockerCompose([service], {}, 'test');
    expect(compose).toMatchSnapshot();
  });

  it('should correctly format devices', () => {
    const service: ServiceInput = {
      name: 'service',
      image: 'image',
      devices: ['/dev/ttyUSB0:/dev/ttyUSB0', '/dev/sda:/dev/xvda:rwm'],
    };

    const compose = composeBuilder.getDockerCompose([service], {}, 'test');
    expect(compose).toMatchSnapshot();
  });

  it('should correctly format entrypoint as string', () => {
    const service: ServiceInput = {
      name: 'service',
      image: 'image',
      entrypoint: 'entrypoint',
    };

    const compose = composeBuilder.getDockerCompose([service], {}, 'test');

    expect(compose).toMatchSnapshot();
  });

  it('should correctly format entrypoint as array', () => {
    const service: ServiceInput = {
      name: 'service',
      image: 'image',
      entrypoint: ['entrypoint', 'arg1', 'arg2'],
    };

    const compose = composeBuilder.getDockerCompose([service], {}, 'test');

    expect(compose).toMatchSnapshot();
  });

  it('should correctly format logging', () => {
    const service: ServiceInput = {
      name: 'service',
      image: 'image',
      logging: { driver: 'json-file', options: { 'syslog-address': 'tcp://192.168.0.42:123' } },
    };

    const compose = composeBuilder.getDockerCompose([service], {}, 'test');

    expect(compose).toMatchSnapshot();
  });

  it('should correctly format a complex docker-compose file', () => {
    const service1: ServiceInput = {
      name: 'service1',
      image: 'image1',
      internalPort: 80,
      addPorts: [{ containerPort: 8080, hostPort: 3400 }],
      extraHosts: ['host1', 'host2'],
      ulimits: { nproc: 1024, nofile: 65536 },
      command: 'node index.js',
      volumes: [
        { hostPath: '/host/path', containerPath: '/container/path', readOnly: true },
        { hostPath: '/host/path2', containerPath: '/container/path2' },
      ],
      environment: { NODE_ENV: 'production', PORT: 80, SOME_VAR: 'value' },
      healthCheck: { test: 'curl -f http://localhost/ || exit 1', interval: '1m30s', timeout: '10s', retries: 3, startPeriod: '40s' },
      dependsOn: ['service2'],
      capAdd: ['SYS_ADMIN', 'NET_ADMIN'],
      deploy: {
        resources: {
          limits: { cpus: '0.50', memory: '50M', pids: 1 },
          reservations: { cpus: '0.25', memory: '20M', devices: [{ capabilities: ['gpu'], driver: 'nvidia', count: 'all' }] },
        },
      },
      hostname: 'hostname',
      devices: ['/dev/ttyUSB0:/dev/ttyUSB0', '/dev/sda:/dev/xvda:rwm'],
      entrypoint: ['entrypoint', 'arg1', 'arg2'],
      pid: '1',
      privileged: true,
      tty: true,
      user: 'user',
      workingDir: '/working/dir',
      shmSize: '1G',
      capDrop: ['SYS_ADMIN', 'NET_ADMIN'],
      logging: { driver: 'json-file', options: { 'syslog-address': 'tcp://192.168.0.42:123' } },
      readOnly: true,
      securityOpt: ['label=disable', 'label=role:ROLE'],
      stopSignal: 'SIGTERM',
      stopGracePeriod: '1m',
      stdinOpen: true,
    };

    const service2: ServiceInput = {
      name: 'service2',
      image: 'image2',
    };

    const compose = composeBuilder.getDockerCompose([service1, service2], {}, 'test');

    expect(compose).toMatchSnapshot();
  });

  it('should add correct traefik labels to the main service', () => {
    const service: ServiceInput = {
      name: 'service',
      image: 'image',
      internalPort: 440,
      isMain: true,
    };

    const compose = composeBuilder.getDockerCompose([service], { exposed: true, exposedLocal: true, openPort: true }, 'test');

    expect(compose).toMatchSnapshot();
  });
});
