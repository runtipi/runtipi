import { z } from 'zod';

export const EVENT_TYPES = {
  SYSTEM: 'system',
  REPO: 'repo',
  APP: 'app',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

const appEventSchema = z.object({
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
    z.literal('backup'),
  ]),
  appid: z.string(),
  skipEnv: z.boolean().optional().default(false),
  form: z
    .object({
      exposed: z.boolean().optional(),
      exposedLocal: z.boolean().optional(),
      openPort: z.boolean().optional(),
      domain: z.string().optional(),
      isVisibleOnGuestDashboard: z.boolean().optional(),
    })
    .extend({})
    .catchall(z.unknown()),
});

const restoreAppCommandSchema = z.object({
  type: z.literal(EVENT_TYPES.APP),
  command: z.literal('restore'),
  appid: z.string(),
  filename: z.string(),
});

export type AppEventFormInput = z.input<typeof appEventSchema>['form'];
export type AppEventForm = z.output<typeof appEventSchema>['form'];

const repoCommandSchema = z.object({
  type: z.literal(EVENT_TYPES.REPO),
  command: z.union([z.literal('clone'), z.literal('update')]),
  url: z.string().url(),
});

const systemCommandSchema = z.object({
  type: z.literal(EVENT_TYPES.SYSTEM),
  command: z.literal('system_info'),
});

export const eventSchema = appEventSchema.or(restoreAppCommandSchema).or(repoCommandSchema).or(systemCommandSchema);

export const eventResultSchema = z.object({
  success: z.boolean(),
  stdout: z.string(),
});

export type SystemEvent = z.input<typeof eventSchema>;
