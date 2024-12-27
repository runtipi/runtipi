import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const appFormSchema = z
  .object({
    port: z.coerce.number().optional(),
    exposed: z.boolean().optional(),
    exposedLocal: z.boolean().optional(),
    openPort: z.boolean().optional().default(true),
    domain: z.string().optional(),
    isVisibleOnGuestDashboard: z.boolean().optional(),
  })
  .extend({})
  .catchall(z.unknown());

export class AppFormBody extends createZodDto(
  z.object({
    port: z.string().optional(),
    exposed: z.boolean().optional(),
    exposedLocal: z.boolean().optional(),
    openPort: z.boolean().optional(),
    domain: z.string().optional(),
    isVisibleOnGuestDashboard: z.boolean().optional(),
  }),
) {}

export class UninstallAppBody extends createZodDto(z.object({ removeBackups: z.boolean() })) {}

export class UpdateAppBody extends createZodDto(z.object({ performBackup: z.boolean() })) {}
