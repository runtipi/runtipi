import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Pull
export class PullDto extends createZodDto(
  z.object({
    success: z.boolean(),
  }),
) {}

