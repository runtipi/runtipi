import { inferRouterOutputs } from '@trpc/server';
import { router, protectedProcedure, publicProcedure } from '../../trpc';
import { SystemServiceClass } from '../../services/system';
import { settingsSchema } from '../../core/TipiConfig/TipiConfig';
import * as TipiConfig from '../../core/TipiConfig';

export type SystemRouterOutput = inferRouterOutputs<typeof systemRouter>;
const SystemService = new SystemServiceClass();

export const systemRouter = router({
  status: publicProcedure.query(SystemServiceClass.status),
  systemInfo: protectedProcedure.query(SystemServiceClass.systemInfo),
  getVersion: publicProcedure.query(SystemService.getVersion),
  restart: protectedProcedure.mutation(SystemService.restart),
  update: protectedProcedure.mutation(SystemService.update),
  updateSettings: protectedProcedure.input(settingsSchema.partial()).mutation(({ input }) => TipiConfig.setSettings(input)),
  getSettings: protectedProcedure.query(TipiConfig.getSettings),
});
