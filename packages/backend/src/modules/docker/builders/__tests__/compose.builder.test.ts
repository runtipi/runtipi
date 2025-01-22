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
    const service = serviceBuilder.setName(serviceName).setImage('image').build();

    composeBuilder.addService(service);

    const compose = composeBuilder.build();

    expect(compose).toMatchSnapshot();
  });

  it('should correctly format deploy resources', () => {
    const service = serviceBuilder
      .setName('service')
      .setImage('image')
      .setDeploy({
        resources: {
          limits: { cpus: '0.50', memory: '50M', pids: 1 },
          reservations: { cpus: '0.25', memory: '20M', devices: [{ capabilities: ['gpu'], driver: 'nvidia', count: 'all' }] },
        },
      })
      .build();

    const compose = composeBuilder.addService(service).build();

    expect(compose).toMatchSnapshot();
  });

  it('should correctly format devices', () => {
    const service = serviceBuilder.setName('service').setImage('image').setDevices(['/dev/ttyUSB0:/dev/ttyUSB0', '/dev/sda:/dev/xvda:rwm']).build();
    const compose = composeBuilder.addService(service).build();

    expect(compose).toMatchSnapshot();
  });

  it('should correctly format entrypoint as string', () => {
    const service = serviceBuilder.setName('service').setImage('image').setEntrypoint('entrypoint').build();
    const compose = composeBuilder.addService(service).build();

    expect(compose).toMatchSnapshot();
  });

  it('should correctly format entrypoint as array', () => {
    const service = serviceBuilder.setName('service').setImage('image').setEntrypoint(['entrypoint', 'arg1', 'arg2']).build();
    const compose = composeBuilder.addService(service).build();

    expect(compose).toMatchSnapshot();
  });

  it('should correctly format logging', () => {
    const service = serviceBuilder
      .setName('service')
      .setImage('image')
      .setLogging({ driver: 'json-file', options: { 'syslog-address': 'tcp://192.168.0.42:123' } })
      .build();
    const compose = composeBuilder.addService(service).build();

    expect(compose).toMatchSnapshot();
  });

  it('should correctly format a complex docker-compose file', () => {
    const service1 = serviceBuilder
      .setName('service1')
      .setImage('image1')
      .setPort({ containerPort: 80, hostPort: 80 })
      .setPort({ containerPort: 8080, hostPort: 9000 })
      .setExtraHosts(['host1', 'host2'])
      .setUlimits({ nproc: 1024, nofile: 65536 })
      .setCommand('node index.js')
      .setVolumes([
        { hostPath: '/host/path', containerPath: '/container/path', readOnly: true },
        { hostPath: '/host/path2', containerPath: '/container/path2' },
      ])
      .setEnvironment({ NODE_ENV: 'production', PORT: 80, SOME_VAR: 'value' })
      .setHealthCheck({ test: 'curl -f http://localhost/ || exit 1', interval: '1m30s', timeout: '10s', retries: 3, startPeriod: '40s' })
      .setDependsOn(['service2'])
      .setCapAdd(['SYS_ADMIN', 'NET_ADMIN'])
      .setDeploy({
        resources: {
          limits: { cpus: '0.50', memory: '50M', pids: 1 },
          reservations: { cpus: '0.25', memory: '20M', devices: [{ capabilities: ['gpu'], driver: 'nvidia', count: 'all' }] },
        },
      })
      .setHostname('hostname')
      .setDevices(['/dev/ttyUSB0:/dev/ttyUSB0', '/dev/sda:/dev/xvda:rwm'])
      .setEntrypoint(['entrypoint', 'arg1', 'arg2'])
      .setPid('1')
      .setPrivileged(true)
      .setTty(true)
      .setUser('user')
      .setWorkingDir('/working/dir')
      .setShmSize('1G')
      .setCapDrop(['SYS_ADMIN', 'NET_ADMIN'])
      .setLogging({ driver: 'json-file', options: { 'syslog-address': 'tcp://192.168.0.42:123' } })
      .setReadOnly(true)
      .setSecurityOpt(['label=disable', 'label=role:ROLE'])
      .setStopSignal('SIGTERM')
      .setStopGracePeriod('1m')
      .setStdinOpen(true)
      .build();

    const service2 = new ServiceBuilder().setName('service2').setImage('image2').build();

    const compose = composeBuilder.addService(service1).addService(service2).addNetwork({ external: true, name: 'network' }).build();

    expect(compose).toMatchSnapshot();
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

    const yaml = composeBuilder.getDockerCompose(composeJson.services, { appId: 'test-app', openPort: true });

    expect(yaml).toMatchSnapshot();
  });
});
