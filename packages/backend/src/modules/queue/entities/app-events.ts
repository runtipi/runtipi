import { Injectable } from '@nestjs/common';
import { arkAppUrn } from '@runtipi/common/types';
import { type } from 'arktype';
import { Queue } from '../queue.entity';

const localSubdomainSchema = type('string').narrow((v, ctx) => (/^[a-zA-Z0-9-]{1,63}$/.test(v) ? true : ctx.mustBe('a valid subdomain')));

const queueAppFormSchema = type({
  port: type('1023 < number < 65536').optional(),
  exposed: 'boolean?',
  exposedLocal: 'boolean?',
  openPort: type('boolean').default(true),
  domain: 'string?',
  isVisibleOnGuestDashboard: 'boolean?',
  enableAuth: 'boolean?',
  localSubdomain: localSubdomainSchema.optional(),
  skipEnv: type('boolean').default(false),
  skipPull: type('boolean').default(false),
  skipRun: type('boolean').default(false),
  '[string]': 'unknown',
});

const commonAppCommandSchema = type({
  command: type("'start' | 'stop' | 'install' | 'uninstall' | 'reset' | 'restart' | 'generate_env' | 'backup'"),
  appUrn: arkAppUrn,
  form: queueAppFormSchema,
  requestId: 'string.uuid',
});

const restoreAppCommandSchema = type({
  command: type.unit('restore'),
  appUrn: arkAppUrn,
  filename: 'string',
  form: queueAppFormSchema,
  requestId: 'string.uuid',
});

const updateAppCommandSchema = type({
  command: type.unit('update'),
  appUrn: arkAppUrn,
  form: queueAppFormSchema,
  performBackup: type('boolean').default(true),
  requestId: 'string.uuid',
});

export const appEventSchema = type.or(commonAppCommandSchema, restoreAppCommandSchema, updateAppCommandSchema);
export type AppEvent = typeof appEventSchema.infer;

export const appEventResultSchema = type({
  success: 'boolean',
  message: 'string',
});

// Match former Zod semantics:
// - `.catchall(z.unknown())` => allow arbitrary extra keys
// - `.default(...)` => output always has the value, input may omit
export type AppEventFormInput = {
  [key: string]: unknown;
  port?: number;
  exposed?: boolean;
  exposedLocal?: boolean;
  openPort?: boolean;
  domain?: string;
  isVisibleOnGuestDashboard?: boolean;
  enableAuth?: boolean;
  localSubdomain?: string;
  skipEnv?: boolean;
  skipPull?: boolean;
  skipRun?: boolean;
};

export type AppEventForm = {
  [key: string]: unknown;
  port?: number;
  exposed?: boolean;
  exposedLocal?: boolean;
  openPort: boolean;
  domain?: string;
  isVisibleOnGuestDashboard?: boolean;
  enableAuth?: boolean;
  localSubdomain?: string;
  skipEnv: boolean;
  skipPull: boolean;
  skipRun: boolean;
};

@Injectable()
export class AppEventsQueue extends Queue<typeof appEventSchema, typeof appEventResultSchema> {}
