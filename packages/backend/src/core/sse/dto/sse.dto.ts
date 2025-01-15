import { z } from 'zod';

export type Topic = 'app' | 'app-logs' | 'runtipi-logs';

export const sseSchema = z.union([
  z.object({
    topic: z.literal('app'),
    data: z.object({
      event: z.union([
        z.literal('status_change'),
        z.literal('install_success'),
        z.literal('install_error'),
        z.literal('uninstall_success'),
        z.literal('uninstall_error'),
        z.literal('reset_success'),
        z.literal('reset_error'),
        z.literal('update_success'),
        z.literal('update_error'),
        z.literal('start_success'),
        z.literal('start_error'),
        z.literal('stop_success'),
        z.literal('stop_error'),
        z.literal('restart_success'),
        z.literal('restart_error'),
        z.literal('generate_env_success'),
        z.literal('generate_env_error'),
        z.literal('backup_success'),
        z.literal('backup_error'),
        z.literal('restore_success'),
        z.literal('restore_error'),
      ]),
      appId: z.string(),
      appStatus: z
        .enum([
          'running',
          'stopped',
          'starting',
          'stopping',
          'updating',
          'missing',
          'installing',
          'uninstalling',
          'resetting',
          'restarting',
          'backing_up',
          'restoring',
        ])
        .optional(),
      error: z.string().optional(),
    }),
  }),
  z.object({
    topic: z.literal('app-logs'),
    data: z.object({
      event: z.union([z.literal('newLogs'), z.literal('stopLogs')]),
      appId: z.string(),
      lines: z.array(z.string()).optional(),
    }),
  }),
  z.object({
    topic: z.literal('runtipi-logs'),
    data: z.object({
      event: z.union([z.literal('newLogs'), z.literal('stopLogs')]),
      lines: z.array(z.string()).optional(),
    }),
  }),
]);

export type SSE = z.infer<typeof sseSchema>;
