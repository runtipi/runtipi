import { inferRouterOutputs } from '@trpc/server';
import { router, protectedProcedure, publicProcedure } from '../../trpc';
import { SystemService } from '../../services/system/system.service';

export type SystemRouterOutput = inferRouterOutputs<typeof systemRouter>;

export const systemRouter = router({
  status: publicProcedure.query(SystemService.status),
  systemInfo: protectedProcedure.query(SystemService.systemInfo),
  getVersion: protectedProcedure.query(SystemService.getVersion),
  restart: protectedProcedure.mutation(SystemService.restart),
  update: protectedProcedure.mutation(SystemService.update),
});
