import { appFormSchema } from '@/modules/app-lifecycle/dto/app-lifecycle.dto';
import type { AppUrn } from '@/types/app/app.types';
import { Injectable } from '@nestjs/common';
import type { AppUrn } from '@runtipi/common/types';
import { type ZodStringDef, z } from 'zod';
import { Queue } from '../queue.entity';

const commonAppCommandSchema = z.object({
  command: z.union([
    z.literal('start'),
    z.literal('stop'),
    z.literal('install'),
    z.literal('uninstall'),
    z.literal('reset'),
    z.literal('restart'),
    z.literal('generate_env'),
    z.literal('backup'),
  ]),
  appUrn: z.string().refine((v) => v.split(':').length === 2) as unknown as z.ZodType<AppUrn, ZodStringDef>,
  skipEnv: z.boolean().optional().default(false),
  form: appFormSchema,
});

const restoreAppCommandSchema = z.object({
  command: z.literal('restore'),
  appUrn: z.string().refine((v) => v.split(':').length === 2) as unknown as z.ZodType<AppUrn, ZodStringDef>,
  filename: z.string(),
  form: appFormSchema,
});

const updateAppCommandSchema = z.object({
  command: z.literal('update'),
  appUrn: z.string().refine((v) => v.split(':').length === 2) as unknown as z.ZodType<AppUrn, ZodStringDef>,
  form: appFormSchema,
  performBackup: z.boolean().optional().default(true),
});

export const appEventSchema = commonAppCommandSchema.or(restoreAppCommandSchema).or(updateAppCommandSchema);

export const appEventResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type AppEventFormInput = z.input<typeof commonAppCommandSchema>['form'];
export type AppEventForm = z.output<typeof commonAppCommandSchema>['form'];

@Injectable()
export class AppEventsQueue extends Queue<typeof appEventSchema, typeof appEventResultSchema> {}
