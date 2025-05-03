import { createAppUrn } from '@/common/helpers/app-helpers';
import { beforeEach, describe, expect, it } from 'vitest';
import yaml from 'yaml';
import { DockerComposeBuilder } from '../compose.builder';
import type { ServiceInput } from '../schemas';
import { ServiceBuilder } from '../service.builder';

const urn = createAppUrn('nginx', 'store-id');
const subnet = '10.128.1.0/24';

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

    const compose = composeBuilder.getDockerCompose([service], {}, urn, subnet);
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

    const compose = composeBuilder.getDockerCompose([service], {}, urn, subnet);
    expect(compose).toMatchSnapshot();
  });

  it('should correctly format devices', () => {
    const service: ServiceInput = {
      name: 'service',
      image: 'image',
      devices: ['/dev/ttyUSB0:/dev/ttyUSB0', '/dev/sda:/dev/xvda:rwm'],
    };

    const compose = composeBuilder.getDockerCompose([service], {}, urn, subnet);
    expect(compose).toMatchSnapshot();
  });

  it('should correctly format entrypoint as string', () => {
    const service: ServiceInput = {
      name: 'service',
      image: 'image',
      entrypoint: 'entrypoint',
    };

    const compose = composeBuilder.getDockerCompose([service], {}, urn, subnet);

    expect(compose).toMatchSnapshot();
  });

  it('should correctly format entrypoint as array', () => {
    const service: ServiceInput = {
      name: 'service',
      image: 'image',
      entrypoint: ['entrypoint', 'arg1', 'arg2'],
    };

    const compose = composeBuilder.getDockerCompose([service], {}, urn, subnet);

    expect(compose).toMatchSnapshot();
  });

  it('should correctly format logging', () => {
    const service: ServiceInput = {
      name: 'service',
      image: 'image',
      logging: { driver: 'json-file', options: { 'syslog-address': 'tcp://192.168.0.42:123' } },
    };

    const compose = composeBuilder.getDockerCompose([service], {}, urn, subnet);

    expect(compose).toMatchSnapshot();
  });

  it('should correctly interpolate RUNTIPI_APP_ID in service labels', () => {
    const service = serviceBuilder
      .setName('service')
      .setImage('image')
      .setLabels({
        '{{RUNTIPI_APP_ID}}.service': true,
        'com.docker.compose.service': '{{RUNTIPI_APP_ID}}',
        '{{ RUNTIPI_APP_ID }}': '{{ RUNTIPI_APP_ID }}',
      })
      .interpolateVariables('my-test-app')
      .build();

    const compose = composeBuilder.addService(service).build();

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

    const compose = composeBuilder.getDockerCompose([service1, service2], {}, urn, subnet);

    expect(compose).toMatchSnapshot();
  });

  it('should add correct traefik labels to the main service', () => {
    const service: ServiceInput = {
      name: 'service',
      image: 'image',
      internalPort: 440,
      isMain: true,
    };

    const compose = composeBuilder.getDockerCompose([service], { exposed: true, exposedLocal: true, openPort: true }, urn, subnet);

    expect(compose).toMatchSnapshot();
  });

  it('should add traefik labels when service is exposed and has internalPort', () => {
    const service: ServiceInput = {
      name: 'service',
      image: 'image',
      internalPort: 440,
      isMain: true,
    };

    const compose = composeBuilder.getDockerCompose([service], { exposed: true }, urn, subnet);
    const yamlObject = yaml.parse(compose);

    expect(yamlObject.services.service.labels).toBeDefined();
    expect(yamlObject.services.service.labels['traefik.enable']).toBe(true);
    expect(yamlObject.services.service.labels['traefik.http.routers.nginx-store-id.rule']).toBeDefined();
  });

  it('should not add traefik labels when service is not exposed', () => {
    const service: ServiceInput = {
      name: 'service',
      image: 'image',
      internalPort: 440,
      isMain: true,
    };

    const compose = composeBuilder.getDockerCompose([service], { exposed: false, exposedLocal: false }, urn, subnet);
    const yamlObject = yaml.parse(compose);

    expect(yamlObject.services.service.labels).toEqual({ 'runtipi.managed': true });
  });

  it('should be able to parse a compose.json file', async () => {
    const composeJson: { services: ServiceInput[] } = {
      services: [
        {
          // @ts-expect-error
          something: 'crazy',
          name: 'ctfd',
          image: 'ctfd/ctfd:3.7.5',
          isMain: true,
          internalPort: 8000,
          environment: {
            UPLOAD_FOLDER: '/var/uploads',
            DATABASE_URL: 'mysql+pymysql://tipi:${CTFD_MYSQL_DB_PASSWORD}@ctfd-db/ctfd',
          },
          dependsOn: ['ctfd-db'],
          volumes: [
            {
              hostPath: '${APP_DATA_DIR}/data/uploads',
              containerPath: '/var/log/CTFd',
            },
            {
              hostPath: '${APP_DATA_DIR}/data/uploads',
              containerPath: '/var/uploads',
            },
          ],
          extraLabels: {
            'some-label': 'some-value',
            '{{RUNTIPI_APP_ID}}.service': true,
            'com.docker.compose.service': '{{RUNTIPI_APP_ID}}',
            '{{ RUNTIPI_APP_ID }}': '{{ RUNTIPI_APP_ID }}',
            // Example of overriding
            'traefik.http.middlewares.ctfd-web-redirect.redirectscheme.scheme': 'wrongscheme',
          },
        },
        {
          name: 'ctfd-db',
          image: 'mariadb:10.4.12',
          environment: {
            MYSQL_ROOT_PASSWORD: '${CTFD_MYSQL_ROOT_PASSWORD}',
            MYSQL_USER: 'tipi',
            MYSQL_PASSWORD: '${CTFD_MYSQL_DB_PASSWORD}',
            MYSQL_DATABASE: 'ctfd',
          },
          volumes: [
            {
              hostPath: '${APP_DATA_DIR}/data/db',
              containerPath: '/var/lib/mysql',
            },
          ],
          command: ['mysqld', '--character-set-server=utf8mb4', '--collation-server=utf8mb4_unicode_ci', '--wait_timeout=28800', '--log-warnings=0'],
        },
        {
          name: 'ctfd-redis',
          image: 'redis:4',
          volumes: [
            {
              hostPath: '${APP_DATA_DIR}/data/redis',
              containerPath: '/data',
            },
          ],
        },
      ],
    };

    const yaml = composeBuilder.getDockerCompose(composeJson.services, { appId: 'test-app', openPort: true }, urn, subnet);

    expect(yaml).toMatchSnapshot();
  });
});
