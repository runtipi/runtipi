import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Pull
export class PullDto extends createZodDto(
  z.object({
    success: z.boolean(),
  }),
) {}

export class AllAppStoresDto extends createZodDto(
  z
    .object({
      id: z.number(),
      name: z.string(),
      url: z.string(),
      enabled: z.boolean(),
    })
    .array(),
) {}
