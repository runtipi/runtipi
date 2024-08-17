import { z } from 'zod';

export const repoSchema = z.record(z.string(), z.string().url());

export type RepoSchema = z.infer<typeof repoSchema>;
