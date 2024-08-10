import { faker } from '@faker-js/faker';
/* eslint-disable no-template-curly-in-string */
import { describe, expect, it } from 'vitest';
import { type ServiceInput, getDockerCompose } from '../docker-templates';

describe('getDockerCompose', async () => {
  it('should return correct docker-compose config', async () => {
    // arrange
    const serviceName1 = faker.word.noun();
    const serviceName2 = faker.word.noun();

    const serviceImage1 = faker.system.semver();
    const serviceImage2 = faker.system.semver();

    const servicePort1 = faker.number.int({ min: 64, max: 65535 });
    const servicePort2 = faker.number.int({ min: 64, max: 65535 });

    const fakeEnv = {
      one: faker.system.semver(),
      two: faker.system.semver(),
    };

    const services = [
      {
        isMain: true,
        volumes: [
          { hostPath: '${APP_DATA_DIR}/data/redis', containerPath: '/data' },
          { hostPath: '${APP_DATA_DIR}/logs/redis', containerPath: '/logs', readOnly: true },
        ],
        dependsOn: {
          [serviceName2]: {
            condition: 'service_healthy',
          },
        },
        name: serviceName1,
        image: serviceImage1,
        internalPort: servicePort1,
        environment: fakeEnv,
      },
      {
        name: serviceName2,
        healthCheck: {
          test: 'curl --fail http://localhost:3000 || exit 1',
          retries: 3,
          interval: '30s',
          timeout: '10s',
        },
        dependsOn: [serviceName1],
        image: serviceImage2,
        internalPort: servicePort2,
        addPorts: [
          { containerPort: 3000, hostPort: 4444, tcp: true },
          { containerPort: 3001, hostPort: 4445, udp: true },
          { containerPort: 3002, hostPort: 4446 },
        ],
      },
    ] satisfies ServiceInput[];

    // act
    const result = getDockerCompose(services, {
      exposed: false,
      exposedLocal: false,
      openPort: true,
      isVisibleOnGuestDashboard: false,
    });

    // assert
    expect(result).toMatchInlineSnapshot(`
      "services:
        ${serviceName1}:
          image: ${serviceImage1}
          container_name: ${serviceName1}
          restart: unless-stopped
          networks:
            - tipi_main_network
          environment:
            one: ${fakeEnv.one}
            two: ${fakeEnv.two}
          ports:
            - \${APP_PORT}:${servicePort1}
          volumes:
            - \${APP_DATA_DIR}/data/redis:/data
            - \${APP_DATA_DIR}/logs/redis:/logs:ro
          depends_on:
            ${serviceName2}:
              condition: service_healthy
          labels:
            generated: true
            traefik.enable: false
            traefik.http.middlewares.${serviceName1}-web-redirect.redirectscheme.scheme: https
            traefik.http.services.${serviceName1}.loadbalancer.server.port: "${servicePort1}"
        ${serviceName2}:
          image: ${serviceImage2}
          container_name: ${serviceName2}
          restart: unless-stopped
          networks:
            - tipi_main_network
          healthcheck:
            test: curl --fail http://localhost:3000 || exit 1
            interval: 30s
            timeout: 10s
            retries: 3
          ports:
            - 4444:3000/tcp
            - 4445:3001/udp
            - 4446:3002
          depends_on:
            - ${serviceName1}
      networks:
        tipi_main_network:
          name: runtipi_tipi_main_network
          external: true
      "
    `);
  });

  it('should add traefik labels when exposed is true', async () => {
    // arrange
    const serviceName1 = faker.word.noun();
    const serviceImage1 = faker.system.semver();
    const servicePort1 = faker.number.int({ min: 64, max: 65535 });

    const services = [
      {
        isMain: true,
        name: serviceName1,
        image: serviceImage1,
        internalPort: servicePort1,
      },
    ] satisfies ServiceInput[];

    // act
    const result = getDockerCompose(services, {
      exposed: true,
      exposedLocal: false,
      openPort: false,
      isVisibleOnGuestDashboard: false,
    });

    // assert
    expect(result).toMatchInlineSnapshot(`
      "services:
        ${serviceName1}:
          image: ${serviceImage1}
          container_name: ${serviceName1}
          restart: unless-stopped
          networks:
            - tipi_main_network
          labels:
            generated: true
            traefik.enable: true
            traefik.http.middlewares.${serviceName1}-web-redirect.redirectscheme.scheme: https
            traefik.http.services.${serviceName1}.loadbalancer.server.port: "${servicePort1}"
            traefik.http.routers.${serviceName1}-insecure.rule: Host(\`\${APP_DOMAIN}\`)
            traefik.http.routers.${serviceName1}-insecure.service: ${serviceName1}
            traefik.http.routers.${serviceName1}-insecure.middlewares: ${serviceName1}-web-redirect
            traefik.http.routers.${serviceName1}.rule: Host(\`\${APP_DOMAIN}\`)
            traefik.http.routers.${serviceName1}.entrypoints: websecure
            traefik.http.routers.${serviceName1}.tls.certresolver: myresolver
      networks:
        tipi_main_network:
          name: runtipi_tipi_main_network
          external: true
      "
    `);
  });

  it('should add traefik labels when exposedLocal is true', async () => {
    // arrange
    const serviceName1 = faker.word.noun();
    const serviceImage1 = faker.system.semver();
    const servicePort1 = faker.number.int({ min: 64, max: 65535 });

    const services = [
      {
        isMain: true,
        name: serviceName1,
        image: serviceImage1,
        internalPort: servicePort1,
      },
    ] satisfies ServiceInput[];

    // act
    const result = getDockerCompose(services, {
      exposed: false,
      exposedLocal: true,
      openPort: false,
      isVisibleOnGuestDashboard: false,
    });

    // assert
    expect(result).toMatchInlineSnapshot(`
      "services:
        ${serviceName1}:
          image: ${serviceImage1}
          container_name: ${serviceName1}
          restart: unless-stopped
          networks:
            - tipi_main_network
          labels:
            generated: true
            traefik.enable: true
            traefik.http.middlewares.${serviceName1}-web-redirect.redirectscheme.scheme: https
            traefik.http.services.${serviceName1}.loadbalancer.server.port: "${servicePort1}"
            traefik.http.routers.${serviceName1}-local-insecure.rule: Host(\`${serviceName1}.\${LOCAL_DOMAIN}\`)
            traefik.http.routers.${serviceName1}-local-insecure.entrypoints: web
            traefik.http.routers.${serviceName1}-local-insecure.service: ${serviceName1}
            traefik.http.routers.${serviceName1}-local-insecure.middlewares: ${serviceName1}-web-redirect
            traefik.http.routers.${serviceName1}-local.rule: Host(\`${serviceName1}.\${LOCAL_DOMAIN}\`)
            traefik.http.routers.${serviceName1}-local.entrypoints: websecure
            traefik.http.routers.${serviceName1}-local.service: ${serviceName1}
            traefik.http.routers.${serviceName1}-local.tls: true
      networks:
        tipi_main_network:
          name: runtipi_tipi_main_network
          external: true
      "
    `);
  });
});
