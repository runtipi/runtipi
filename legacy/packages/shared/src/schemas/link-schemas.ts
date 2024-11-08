import { z } from 'zod';

export const linkSchema = z.object({
  id: z.number().nullable().optional(),
  title: z.string().min(1).max(20),
  description: z.string().min(0).max(50).nullable(),
  url: z.string().url(),
  iconUrl: z.string().url().or(z.string().max(0)).nullable(),
  userId: z.number().nullable().optional(),
});

export type LinkInfo = z.output<typeof linkSchema>;
export type LinkInfoInput = z.input<typeof linkSchema>;
