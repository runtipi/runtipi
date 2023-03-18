import { z } from 'zod';
import { inferRouterOutputs } from '@trpc/server';
import { AppServiceClass } from '../../services/apps/apps.service';
import { router, protectedProcedure, permissionProcedure } from '../../trpc';
import { prisma } from '../../db/client';

export type AppRouterOutput = inferRouterOutputs<typeof appRouter>;
const AppService = new AppServiceClass(prisma);

const formSchema = z.object({}).catchall(z.any());

export const appRouter = router({
  // Protected
  getApp: protectedProcedure.input(z.object({ id: z.string() })).query(({ input }) => AppService.getApp(input.id)),
  installedApps: protectedProcedure.query(AppService.installedApps),
  listApps: protectedProcedure.query(() => AppServiceClass.listApps()),
  // Permission
  startApp: permissionProcedure('ADMINISTRATE_APPS')
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => AppService.startApp(input.id)),
  installApp: permissionProcedure('ADMINISTRATE_APPS')
    .input(z.object({ id: z.string(), form: formSchema, exposed: z.boolean().optional(), domain: z.string().optional() }))
    .mutation(({ input }) => AppService.installApp(input.id, input.form, input.exposed, input.domain)),
  updateAppConfig: permissionProcedure('ADMINISTRATE_APPS')
    .input(z.object({ id: z.string(), form: formSchema, exposed: z.boolean().optional(), domain: z.string().optional() }))
    .mutation(({ input }) => AppService.updateAppConfig(input.id, input.form, input.exposed, input.domain)),
  stopApp: permissionProcedure('ADMINISTRATE_APPS')
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => AppService.stopApp(input.id)),
  uninstallApp: permissionProcedure('ADMINISTRATE_APPS')
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => AppService.uninstallApp(input.id)),
  updateApp: permissionProcedure('ADMINISTRATE_APPS')
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => AppService.updateApp(input.id)),
});
