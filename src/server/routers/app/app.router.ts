import { z } from 'zod';
import { inferRouterOutputs } from '@trpc/server';
import { db } from '@/server/db';
import { AppServiceClass } from '../../services/apps/apps.service';
import { router, protectedProcedure } from '../../trpc';

export type AppRouterOutput = inferRouterOutputs<typeof appRouter>;
const AppService = new AppServiceClass(db);

const formSchema = z.object({}).catchall(z.any());

export const appRouter = router({
  getApp: protectedProcedure.input(z.object({ id: z.string() })).query(({ input }) => AppService.getApp(input.id)),
  startAllApp: protectedProcedure.mutation(AppService.startAllApps),
  startApp: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ input }) => AppService.startApp(input.id)),
  installApp: protectedProcedure
    .input(z.object({ id: z.string(), form: formSchema, exposed: z.boolean().optional(), domain: z.string().optional() }))
    .mutation(({ input }) => AppService.installApp(input.id, input.form, input.exposed, input.domain)),
  updateAppConfig: protectedProcedure
    .input(z.object({ id: z.string(), form: formSchema, exposed: z.boolean().optional(), domain: z.string().optional() }))
    .mutation(({ input }) => AppService.updateAppConfig(input.id, input.form, input.exposed, input.domain)),
  stopApp: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ input }) => AppService.stopApp(input.id)),
  uninstallApp: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ input }) => AppService.uninstallApp(input.id)),
  updateApp: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ input }) => AppService.updateApp(input.id)),
  installedApps: protectedProcedure.query(AppService.installedApps),
  listApps: protectedProcedure.query(() => AppServiceClass.listApps()),
});
