import { appFormSchema } from '@/modules/app-lifecycle/dto/app-lifecycle.dto';
import { z } from 'zod';

export const EVENT_TYPES = {
  SYSTEM: 'system',
  REPO: 'repo',
  APP: 'app',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

const updateAppCommandSchema = z.object({
  command: z.literal('update'),
  appid: z.string(),
  form: appFormSchema,
  performBackup: z.boolean(),
});

const restoreAppCommandSchema = z.object({
  command: z.literal('restore'),
  appid: z.string(),
  filename: z.string(),
});

const systemCommandSchema = z.object({
  type: z.literal(EVENT_TYPES.SYSTEM),
  command: z.literal('system_info'),
});

export const eventResultSchema = z.object({
  success: z.boolean(),
  stdout: z.string(),
});
