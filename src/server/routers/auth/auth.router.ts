import { z } from 'zod';
import { AuthServiceClass } from '../../services/auth/auth.service';
import { router, publicProcedure, protectedProcedure } from '../../trpc';
import { prisma } from '../../db/client';

const AuthService = new AuthServiceClass(prisma);

export const authRouter = router({
  login: publicProcedure.input(z.object({ username: z.string(), password: z.string() })).mutation(async ({ input }) => AuthService.login({ ...input })),
  logout: protectedProcedure.mutation(async ({ ctx }) => AuthServiceClass.logout(ctx.session.id)),
  register: publicProcedure.input(z.object({ username: z.string(), password: z.string() })).mutation(async ({ input }) => AuthService.register({ ...input })),
  refreshToken: protectedProcedure.mutation(async ({ ctx }) => AuthServiceClass.refreshToken(ctx.session.id)),
  me: publicProcedure.query(async ({ ctx }) => AuthService.me(ctx.session?.userId)),
  isConfigured: publicProcedure.query(async () => AuthService.isConfigured()),
});
