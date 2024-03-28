/* eslint-disable no-template-curly-in-string */

type GetAppLabelsArgs = {
  internalPort: number;
  appId: string;
};

const getAppLabels = (params: GetAppLabelsArgs) => {
  const { internalPort, appId } = params;

  return {
    // General
    'traefik.enable': true,
    [`traefik.http.middlewares.${appId}-web-redirect.redirectscheme.scheme`]: 'https',
    // HTTP
    [`traefik.http.services.${appId}.loadbalancer.server.port`]: `${internalPort}`,
    [`traefik.http.routers.${appId}-insecure.rule`]: 'Host(`${APP_DOMAIN}`)',
    [`traefik.http.routers.${appId}-insecure.service`]: appId,
    [`traefik.http.routers.${appId}-insecure.middlewares`]: `${appId}-web-redirect`,
    // HTTPS
    [`traefik.http.routers.${appId}.rule`]: 'Host(`${APP_DOMAIN}`)',
    [`traefik.http.routers.${appId}.entrypoints`]: 'websecure',
    [`traefik.http.routers.${appId}.tls.certresolver`]: 'myresolver',
    // HTTP local
    [`traefik.http.routers.${appId}-local-insecure.rule`]: `Host(\`${appId}.\${LOCAL_DOMAIN}\`)`,
    [`traefik.http.routers.${appId}-local-insecure.entrypoints`]: 'web',
    [`traefik.http.routers.${appId}-local-insecure.service`]: appId,
    [`traefik.http.routers.${appId}-local-insecure.middlewares`]: `${appId}-web-redirect`,
    // HTTPS local
    [`traefik.http.routers.${appId}-local.rule`]: `Host(\`${appId}.\${LOCAL_DOMAIN}\`)`,
    [`traefik.http.routers.${appId}-local.entrypoints`]: 'websecure',
    [`traefik.http.routers.${appId}-local.service`]: appId,
    [`traefik.http.routers.${appId}-local.tls`]: true,
  };
};

type ServiceInput = {
  image: string;
  name: string;
  internalPort: number;
  isMain: boolean;
  command?: string;
  volumes?: string[];
  environment?: Record<string, string>;
  healthCheck?: {
    test: string;
    interval: string;
    timeout: string;
    retries: number;
  };
};

type Service = {
  image: string;
  container_name: string;
  ports: string[];
  restart: string;
  networks: string[];
  command?: string;
  labels?: Record<string, string | boolean>;
  volumes: string[];
  environment?: Record<string, string>;
};

const getService = (params: ServiceInput) => {
  const { image, name, internalPort, isMain, command, volumes = [], environment, healthCheck } = params;

  const base = {
    image,
    container_name: name,
    ports: [],
    volumes,
    restart: 'unless-stopped',
    networks: ['tipi_main_network'],
    environment: environment || {},
    healthcheck: healthCheck,
  } as Service;

  if (isMain) {
    base.ports.push(`\${APP_PORT}:${internalPort}`);
    base.labels = getAppLabels({ internalPort, appId: name });
  }

  if (command) {
    base.command = command;
  }

  if (volumes) {
    volumes.forEach((volume) => {
      base.volumes.push(volume);
    });
  }
};

export const getDockerCompose = (services: ServiceInput[]) => {
  return {
    version: '3.9',
    services: services.reduce(
      (acc, service) => {
        acc[service.name] = getService(service);
        return acc;
      },
      {} as Record<string, unknown>,
    ),
  };
};
