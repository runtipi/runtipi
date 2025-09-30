import { type dynamicComposeSchema, dynamicComposeUnion } from '../dynamic-compose.js';
import type { z } from 'zod';
import { composeV1ToLatest } from './converters/v1.js';

export const parseComposeJson = (data: unknown): z.infer<typeof dynamicComposeSchema> => {
  const parsed = dynamicComposeUnion.safeParse(data);

  if (!parsed.success) {
    throw new Error(`Invalid dynamic compose schema: ${parsed.error.message}`);
  }

  // @ts-expect-error schemaVersion 1 is equivalent to undefined
  if (parsed.data.schemaVersion === undefined || parsed.data.schemaVersion === 1) {
    const mainServiceName = Object.values(parsed.data.services).find((s) => s.isMain)?.name;
    console.warn(
      `${mainServiceName} is using deprecated schema version 1 or missing schemaVersion. Please update the compose schema to the latest version. https://runtipi.io/docs/reference/dynamic-compose`,
    );

    return composeV1ToLatest(parsed.data);
  }

  return parsed.data;
};
