import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const linkSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(20),
  description: z.string().min(0).max(50).nullable(),
  url: z.string().url(),
  iconUrl: z.string().url().or(z.string().max(0)).nullable(),
  userId: z.number(),
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
    }),
) {}

export class LinksDto extends createZodDto(z.object({ links: z.array(linkSchema) })) {}
