import { z } from 'zod';

export const linkSchema = z.object({
  title: z.string().min(1).max(20),
  url: z.string().url(),
  iconURL: z.string().url().nullable(),
  userId: z.number(),
});

export type LinkInfo = z.infer<typeof linkSchema>;