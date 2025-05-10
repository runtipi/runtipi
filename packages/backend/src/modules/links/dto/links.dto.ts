import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const linkSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(20),
  description: z.string().min(0).max(50).nullable(),
  url: z.string().url(),
  iconUrl: z.string().url().or(z.string().max(0)).nullable(),
  userId: z.number(),
  isVisibleOnGuestDashboard: z.boolean().default(false),
});

export class LinkBodyDto extends createZodDto(
  linkSchema
    .omit({
      id: true,
      userId: true,
      description: true,
      iconUrl: true,
    })
    .extend({
      description: z.string().min(0).max(50).optional(),
      iconUrl: z.string().url().or(z.string().max(0)).optional(),
      isVisibleOnGuestDashboard: z.boolean().optional().default(false),
    }),
) {}

export class EditLinkBodyDto extends createZodDto(
  linkSchema
    .omit({
      id: true,
      userId: true,
      description: true,
      iconUrl: true,
    })
    .extend({
      description: z.string().min(0).max(50).optional(),
      iconUrl: z.string().url().or(z.string().max(0)).optional(),
      isVisibleOnGuestDashboard: z.boolean().optional(),
    }),
) {}

export class LinksDto extends createZodDto(z.object({ links: z.array(linkSchema) })) {}
