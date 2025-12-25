import { type } from 'arktype';
import { type DynamicCompose, dynamicComposeUnion, MIN_SCHEMA_VERSION, type Service } from '../dynamic-compose.js';
import { composeV1ToLatest, type dynamicComposeSchemaV1 } from './converters/v1.js';
import type { DynamicComposeSchemaYaml } from '../compose-yaml.js';

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
    if (converted[key] === undefined) {
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
    services: {},
  };

  legacy.services.forEach((service) => {
    newCompose.services[service.name] = convertService(service);
  });

  if (legacy.overrides && legacy.overrides.length > 0) {
    newCompose['x-runtipi'] = {
      overrides: legacy.overrides.map((override) => {
        const overrideServices = {} as Record<string, Record<string, unknown>>;
        override.services.forEach((service) => {
          if (service.name) {
            overrideServices[service.name] = convertService(service);
          }
        });

        return {
          architecture: override.architecture as 'arm64' | 'amd64',
          services: overrideServices,
        };
      }),
    };
  }

  return newCompose;
};
