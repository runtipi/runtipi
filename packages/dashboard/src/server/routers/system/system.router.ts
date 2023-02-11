import { inferRouterOutputs } from '@trpc/server';
import { router, protectedProcedure, publicProcedure } from '../../trpc';
import { SystemServiceClass } from '../../services/system';

export type SystemRouterOutput = inferRouterOutputs<typeof systemRouter>;
const SystemService = new SystemServiceClass();

export const systemRouter = router({
  status: publicProcedure.query(SystemServiceClass.status),
  systemInfo: protectedProcedure.query(SystemServiceClass.systemInfo),
  getVersion: publicProcedure.query(SystemService.getVersion),
  restart: protectedProcedure.mutation(SystemService.restart),
  update: protectedProcedure.mutation(SystemService.update),
});
