import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const appFormSchema = z
  .object({
    exposed: z.boolean().optional(),
    exposedLocal: z.boolean().optional(),
    openPort: z.boolean().optional().default(true),
    domain: z.string().optional(),
    isVisibleOnGuestDashboard: z.boolean().optional(),
  })
  .extend({})
  .catchall(z.unknown());

export class AppFormBody extends createZodDto(appFormSchema) {}
