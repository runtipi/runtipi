import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const toJsonSchema = <T>(schema: z.ZodType<T>): object => {
  const jsonSchema = zodToJsonSchema(schema, {
    name: 'root',
    allowedAdditionalProperties: true,
  });

  return jsonSchema;
};
