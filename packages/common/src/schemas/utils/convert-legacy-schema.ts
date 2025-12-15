import { type } from 'arktype';
import { type DynamicCompose, dynamicComposeUnion, MIN_SCHEMA_VERSION } from '../dynamic-compose.js';
import { composeV1ToLatest, type dynamicComposeSchemaV1 } from './converters/v1.js';

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
