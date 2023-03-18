import { inferRouterOutputs } from '@trpc/server';
import { router, protectedProcedure, publicProcedure, permissionProcedure } from '../../trpc';
import { SystemServiceClass } from '../../services/system';

export type SystemRouterOutput = inferRouterOutputs<typeof systemRouter>;
const SystemService = new SystemServiceClass();

export const systemRouter = router({
  // Public
  status: publicProcedure.query(SystemServiceClass.status),
  getVersion: publicProcedure.query(SystemService.getVersion),
  // Protected
  systemInfo: protectedProcedure.query(SystemServiceClass.systemInfo),
  // Permission
  restart: permissionProcedure('ADMINISTRATE_SYSTEM').mutation(SystemService.restart),
  update: permissionProcedure('ADMINISTRATE_SYSTEM').mutation(SystemService.update),
});
