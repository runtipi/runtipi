import { appFormSchema } from '@/modules/app-lifecycle/dto/app-lifecycle.dto';
import { Injectable } from '@nestjs/common';
import { zodAppUrn } from '@runtipi/common/types';
import { z } from 'zod';
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
  appUrn: zodAppUrn,
  form: appFormSchema,
  requestId: z.uuid(),
});

const restoreAppCommandSchema = z.object({
  command: z.literal('restore'),
  appUrn: zodAppUrn,
  filename: z.string(),
  form: appFormSchema,
  requestId: z.uuid(),
});

const updateAppCommandSchema = z.object({
  command: z.literal('update'),
  appUrn: zodAppUrn,
  form: appFormSchema,
  performBackup: z.boolean().optional().default(true),
  requestId: z.uuid(),
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
