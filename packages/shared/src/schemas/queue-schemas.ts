import { z } from 'zod';

export const EVENT_TYPES = {
  SYSTEM: 'system',
  REPO: 'repo',
  APP: 'app',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

const appCommandSchema = z.object({
  type: z.literal(EVENT_TYPES.APP),
  command: z.union([
    z.literal('start'),
    z.literal('stop'),
    z.literal('install'),
    z.literal('uninstall'),
    z.literal('update'),
    z.literal('reset'),
    z.literal('restart'),
    z.literal('generate_env'),
  ]),
  appid: z.string(),
  skipEnv: z.boolean().optional().default(false),
  form: z.object({}).catchall(z.any()),
});

const repoCommandSchema = z.object({
  type: z.literal(EVENT_TYPES.REPO),
  command: z.union([z.literal('clone'), z.literal('update')]),
  url: z.string().url(),
});

const systemCommandSchema = z.object({
  type: z.literal(EVENT_TYPES.SYSTEM),
  command: z.literal('system_info'),
});

export const eventSchema = appCommandSchema.or(repoCommandSchema).or(systemCommandSchema);

export const eventResultSchema = z.object({
  success: z.boolean(),
  stdout: z.string(),
});

export type SystemEvent = z.input<typeof eventSchema>;
