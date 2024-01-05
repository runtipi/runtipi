import { z } from 'zod';

export const linkSchema = z.object({
  id: z.number().nullable().optional(),
  title: z.string().min(1).max(20),
  url: z.string().url(),
  iconURL: z.string().url().nullable(),
  userId: z.number().nullable().optional(),
});

export type LinkInfo = z.infer<typeof linkSchema>;