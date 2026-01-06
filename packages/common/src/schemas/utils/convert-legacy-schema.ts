import { type } from 'arktype';
import { type DynamicCompose, dynamicComposeUnion, MIN_SCHEMA_VERSION, type Service } from '../dynamic-compose.js';
import { composeV1ToLatest, type dynamicComposeSchemaV1 } from './converters/v1.js';
import { dynamicComposeSchemaYaml, type DynamicComposeSchemaYaml, type ServiceSchema, type ServicesSchema } from '../compose-yaml.js';

type ParsedCompose = DynamicCompose & { _schemaVersion: number };

export const parseComposeJson = (data: unknown): ParsedCompose => {
  const parsed = dynamicComposeUnion(data);

  if (parsed instanceof type.errors) {
    throw parsed;
  }

  // Determine schema version (V1 has undefined/missing, V2 has 2)
  const schemaVersion = 'schemaVersion' in parsed && typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1;

  // Check if schema version is too old
  if (schemaVersion < MIN_SCHEMA_VERSION) {
    throw new Error('COMPOSE_ERROR_SCHEMA_TOO_OLD');
  }

  if (schemaVersion === 1) {
    const parsedV1 = parsed as typeof dynamicComposeSchemaV1.infer;
    const mainServiceName = parsedV1.services.find((s) => s.isMain)?.name;
    console.warn(
      `${mainServiceName} is using deprecated schema version 1 or missing schemaVersion. Please update the compose schema to the latest version. https://runtipi.io/docs/reference/dynamic-compose`,
    );

    const converted = composeV1ToLatest(parsedV1);
    return { ...converted, _schemaVersion: 1 } as ParsedCompose;
  }

  return { ...parsed, _schemaVersion: schemaVersion } as ParsedCompose;
};

const convertService = (service: Partial<Service>) => {
  const {
    image,
    command,
    addPorts,
    environment,
    volumes,
    healthCheck,
    internalPort,
    addToMainNetwork,
    isMain,
    networkMode,
    extraHosts,
    workingDir,
    shmSize,
    stdinOpen,
    extraLabels,
    capAdd,
    capDrop,
    securityOpt,
    readOnly,
    stopSignal,
    stopGracePeriod,
    dependsOn,
    ulimits,
    restart,
    hostname,
    user,
    tty,
    privileged,
    devices,
    entrypoint,
    pid,
    sysctls,
    logging,
    dns,
    deploy,
  } = service;

  const ports = addPorts?.map((port) => {
    const { interface: iface, hostPort, containerPort, tcp, udp } = port;

    if (tcp && udp) {
      return `${iface ? `${iface}:` : ''}${hostPort}:${containerPort}`;
    }

    return `${iface ? `${iface}:` : ''}${hostPort}:${containerPort}${tcp ? '/tcp' : ''}${udp ? '/udp' : ''}`;
  });

  const envVars = environment?.map((env) => {
    return `${env.key}=${env.value}`;
  });

  const volumeMappings = volumes?.map((vol) => {
    const { hostPath, containerPath, readOnly, bind, shared, private: privateFlag } = vol;
    let volumeStr = `${hostPath}:${containerPath}`;

    const options: string[] = [];
    if (readOnly) options.push('ro');

    if (shared) {
      options.push('z');
    } else if (privateFlag) {
      options.push('Z');
    }

    if (bind?.propagation) {
      options.push(bind.propagation);
    }

    if (options.length > 0) {
      volumeStr += `:${options.join(',')}`;
    }

    return volumeStr;
  });

  const healthcheck = healthCheck
    ? {
        test: healthCheck.test,
        interval: healthCheck.interval,
        timeout: healthCheck.timeout,
        retries: healthCheck.retries,
        start_period: healthCheck.startPeriod,
        start_interval: healthCheck.startInterval,
      }
    : undefined;

  const xRuntipiMeta: Record<string, unknown> = {};
  if (internalPort !== undefined) {
    xRuntipiMeta.internal_port = Number(internalPort);
  }
  if (addToMainNetwork !== undefined) {
    xRuntipiMeta.add_to_main_network = addToMainNetwork;
  }
  if (isMain !== undefined) {
    xRuntipiMeta.is_main = isMain;
  }

  const converted: Record<string, unknown> = {
    image,
    restart,
    command,
    entrypoint,
    user,
    hostname,
    working_dir: workingDir,
    ports,
    volumes: volumeMappings,
    environment: envVars,
    depends_on: dependsOn,
    network_mode: networkMode,
    extra_hosts: extraHosts,
    labels: extraLabels,
    healthcheck,
    deploy,
    ulimits,
    shm_size: shmSize,
    stdin_open: stdinOpen,
    tty,
    privileged,
    cap_add: capAdd,
    cap_drop: capDrop,
    security_opt: securityOpt,
    read_only: readOnly,
    stop_signal: stopSignal,
    stop_grace_period: stopGracePeriod,
    devices,
    pid,
    sysctls,
    logging,
    dns,
  };

  if (Object.keys(xRuntipiMeta).length > 0) {
    converted['x-runtipi'] = xRuntipiMeta;
  }

  Object.keys(converted).forEach((key) => {
    const value = converted[key];
    if (value === undefined || value === null) {
      delete converted[key];
    } else if (Array.isArray(value) && value.length === 0) {
      delete converted[key];
    } else if (typeof value === 'object' && Object.keys(value).length === 0) {
      delete converted[key];
    }
  });

  return converted as ServiceSchema;
};

const convertServiceFromYaml = (name: string, service: Partial<ServiceSchema>): Partial<Service> => {
  const s = service as Record<string, unknown>;
  const xRuntipi = s['x-runtipi'] as Record<string, unknown> | undefined;
  const healthcheck = s.healthcheck as Record<string, unknown> | undefined;

  const addPorts = (s.ports as string[] | undefined)?.map((portStr) => {
    const parts = portStr.split(':');
    let iface: string | undefined;
    let hostPort: string;
    let containerPort: string;

    if (parts.length === 3) {
      iface = parts[0];
      hostPort = parts[1] ?? '';
      containerPort = parts[2] ?? '';
    } else {
      hostPort = parts[0] ?? '';
      containerPort = parts[1] ?? '';
    }

    let tcp = true;
    let udp = true;

    if (containerPort.includes('/')) {
      const [cp, proto] = containerPort.split('/');
      containerPort = cp ?? '';
      tcp = proto === 'tcp';
      udp = proto === 'udp';
    }

    const hostPortNum = Number(hostPort);
    const containerPortNum = Number(containerPort);

    return {
      interface: iface,
      hostPort: Number.isNaN(hostPortNum) ? hostPort : hostPortNum,
      containerPort: Number.isNaN(containerPortNum) ? containerPort : containerPortNum,
      tcp,
      udp,
    };
  });

  const environmentParsed = Array.isArray(s.environment)
    ? s.environment.map((env: string) => {
        const [key, ...valueParts] = env.split('=');
        return { key: key ?? '', value: valueParts.join('=') };
      })
    : typeof s.environment === 'object' && s.environment !== null
      ? Object.entries(s.environment).map(([key, value]) => ({
          key,
          value: value as string | number | boolean,
        }))
      : undefined;

  const volumesParsed = (s.volumes as string[] | undefined)?.map((volStr) => {
    const parts = volStr.split(':');
    const hostPath = parts[0] ?? '';
    const containerPath = parts[1] ?? '';
    const options = parts[2]?.split(',') || [];

    const propagation = options.find((opt) => ['rprivate', 'private', 'rshared', 'shared', 'rslave', 'slave'].includes(opt)) as
      | 'rprivate'
      | 'private'
      | 'rshared'
      | 'shared'
      | 'rslave'
      | 'slave'
      | undefined;

    const vol: Record<string, unknown> = {
      hostPath,
      containerPath,
    };

    if (options.includes('ro')) vol.readOnly = true;
    if (options.includes('z')) vol.shared = true;
    if (options.includes('Z')) vol.private = true;
    if (propagation) vol.bind = { propagation };

    return vol;
  });

  const healthCheck = healthcheck
    ? Object.fromEntries(
        Object.entries({
          test: healthcheck.test as string,
          interval: healthcheck.interval as string | undefined,
          timeout: healthcheck.timeout as string | undefined,
          retries: healthcheck.retries as number | undefined,
          startPeriod: healthcheck.start_period as string | undefined,
          startInterval: healthcheck.start_interval as string | undefined,
        }).filter(([_, v]) => v !== undefined),
      )
    : undefined;

  const extraLabels = Array.isArray(s.labels)
    ? Object.fromEntries(
        s.labels.map((label: string) => {
          const [key, ...valueParts] = label.split('=');
          return [key ?? '', valueParts.join('=')];
        }),
      )
    : (s.labels as Record<string, string | boolean> | undefined);

  const converted: Record<string, unknown> = {
    name,
    image: s.image,
    restart: s.restart,
    command: s.command,
    entrypoint: s.entrypoint,
    user: s.user,
    hostname: s.hostname,
    workingDir: s.working_dir,
    addPorts,
    volumes: volumesParsed,
    environment: environmentParsed,
    dependsOn: s.depends_on,
    networkMode: s.network_mode,
    extraHosts: s.extra_hosts,
    extraLabels,
    healthCheck,
    deploy: s.deploy,
    ulimits: s.ulimits,
    shmSize: s.shm_size,
    stdinOpen: s.stdin_open,
    tty: s.tty,
    privileged: s.privileged,
    capAdd: s.cap_add,
    capDrop: s.cap_drop,
    securityOpt: s.security_opt,
    readOnly: s.read_only,
    stopSignal: s.stop_signal,
    stopGracePeriod: s.stop_grace_period,
    devices: s.devices,
    pid: s.pid,
    sysctls: s.sysctls,
    logging: s.logging,
    dns: s.dns,
    isMain: xRuntipi?.is_main,
    internalPort: xRuntipi?.internal_port,
    addToMainNetwork: xRuntipi?.add_to_main_network,
  };

  Object.keys(converted).forEach((key) => {
    const value = converted[key];
    if (value === undefined || value === null) {
      delete converted[key];
    } else if (Array.isArray(value) && value.length === 0) {
      delete converted[key];
    } else if (typeof value === 'object' && Object.keys(value).length === 0) {
      delete converted[key];
    }
  });

  return converted;
};

export const convertLegacyToYaml = (data: unknown) => {
  if (!data) {
    return { services: {} } as DynamicComposeSchemaYaml;
  }
  const legacy = parseComposeJson(data);

  const newCompose: DynamicComposeSchemaYaml = {
    'x-runtipi': {
      schema_version: 1,
    },
    services: {},
  };

  legacy.services.forEach((service) => {
    newCompose.services[service.name] = convertService(service);
  });

  if (legacy.overrides && legacy.overrides.length > 0) {
    const overrides = legacy.overrides
      .map((override) => {
        const overrideServices: ServicesSchema = {};
        override.services.forEach((service) => {
          if (service.name) {
            overrideServices[service.name] = convertService(service);
          }
        });

        if (Object.keys(overrideServices).length === 0) {
          return undefined;
        }

        return {
          architecture: override.architecture as 'arm64' | 'amd64',
          services: overrideServices,
        };
      })
      .filter((o) => o !== undefined);

    if (overrides.length > 0) {
      newCompose['x-runtipi'] = {
        schema_version: 1,
        overrides: overrides,
      };
    }
  }

  return newCompose;
};

export const convertYamlToLegacy = (data: unknown) => {
  const parsed = dynamicComposeSchemaYaml(data);

  if (parsed instanceof type.errors) {
    throw parsed.summary;
  }

  const yaml = parsed as DynamicComposeSchemaYaml;

  const services = Object.entries(yaml.services).map(([name, service]) => convertServiceFromYaml(name, service));

  const legacy: DynamicCompose = {
    schemaVersion: 2,
    services: services as Service[],
  };

  const runtipiMeta = yaml['x-runtipi'];
  if (runtipiMeta?.overrides) {
    legacy.overrides = runtipiMeta.overrides.map((override) => ({
      architecture: override.architecture,
      services: Object.entries(override.services).map(
        ([name, service]) => convertServiceFromYaml(name, service as ServiceSchema) as Partial<Service>,
      ),
    }));
  }

  return legacy;
};
