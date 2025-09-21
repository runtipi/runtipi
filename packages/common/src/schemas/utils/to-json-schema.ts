import { z } from 'zod';

export const toJsonSchema = <T>(schema: z.ZodType<T>): object => {
  return z.toJSONSchema(schema);
};
