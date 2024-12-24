import { z } from 'zod';

export const socketEventSchema = z.union([
  z.object({
    type: z.literal('app'),
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
    data: z.object({
      appUrn: z.string(),
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
    type: z.literal('app-logs-init'),
    event: z.literal('initLogs'),
    data: z.object({
      appUrn: z.string(),
      maxLines: z.number().optional(),
    }),
  }),
  z.object({
    type: z.literal('app-logs'),
    event: z.union([z.literal('newLogs'), z.literal('stopLogs')]),
    data: z.object({
      appUrn: z.string(),
      lines: z.array(z.string()).optional(),
    }),
  }),
  z.object({
    type: z.literal('runtipi-logs-init'),
    event: z.literal('initLogs'),
    data: z.object({
      maxLines: z.number().optional(),
    }),
  }),
  z.object({
    type: z.literal('runtipi-logs'),
    event: z.union([z.literal('newLogs'), z.literal('stopLogs')]),
    data: z.object({
      lines: z.array(z.string()).optional(),
    }),
  }),
]);

export type SocketEvent = z.infer<typeof socketEventSchema>;
