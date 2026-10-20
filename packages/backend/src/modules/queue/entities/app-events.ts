import { Injectable } from '@nestjs/common';
import { arkAppUrn } from '@runtipi/common/types';
import { type } from 'arktype';
import { Queue } from '../queue.entity';

const localSubdomainSchema = type('string').narrow((v, ctx) => (/^[a-zA-Z0-9-]{1,63}$/.test(v) ? true : ctx.mustBe('a valid subdomain')));

const queueAppFormSchema = type({
  port: type('1023 < number < 65536').optional(),
  exposed: 'boolean?',
  exposedLocal: 'boolean?',
  openPort: type('boolean | undefined').optional(),
  domain: 'string | undefined?',
  isVisibleOnGuestDashboard: 'boolean?',
  enableAuth: 'boolean?',
  localSubdomain: localSubdomainSchema.optional(),
  skipEnv: type('boolean | undefined').optional(),
  skipPull: type('boolean | undefined').optional(),
  skipRun: type('boolean | undefined').optional(),
  '[string]': 'unknown',
});

const appCommandFields = {
  appUrn: arkAppUrn,
  form: queueAppFormSchema,
  requestId: 'string.uuid',
} as const;

const commonAppCommandSchema = type({
  ...appCommandFields,
  command: type("'start' | 'stop' | 'install' | 'uninstall' | 'reset' | 'restart' | 'generate_env'"),
});

const backupAppCommandSchema = type({
  ...appCommandFields,
  command: type.unit('backup'),
  wasRunningBeforeBackup: 'boolean',
});

const restoreAppCommandSchema = type({
  ...appCommandFields,
  command: type.unit('restore'),
  filename: 'string',
});

const updateAppCommandSchema = type({
  ...appCommandFields,
  command: type.unit('update'),
  performBackup: type('boolean').default(true),
  wasRunningBeforeUpdate: type('boolean').default(false),
});

export const appEventSchema = type.or(commonAppCommandSchema, backupAppCommandSchema, restoreAppCommandSchema, updateAppCommandSchema);
export type AppEvent = typeof appEventSchema.infer;

export const appEventResultSchema = type({
  success: 'boolean',
  message: 'string',
  rollbackSucceeded: type('boolean | undefined').optional(),
  recoverySnapshotPath: type('string | undefined').optional(),
});

export type AppEventFormInput = typeof queueAppFormSchema.inferIn;
export type AppEventForm = typeof queueAppFormSchema.infer;

@Injectable()
export class AppEventsQueue extends Queue<typeof appEventSchema, typeof appEventResultSchema> {}
