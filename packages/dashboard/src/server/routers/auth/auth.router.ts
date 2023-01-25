import { z } from 'zod';
import AuthService from '../../services/auth/auth.service';
import { router, publicProcedure, protectedProcedure } from '../../trpc';

export const authRouter = router({
  login: publicProcedure.input(z.object({ username: z.string(), password: z.string() })).mutation(async ({ input }) => AuthService.login({ ...input })),
  logout: protectedProcedure.mutation(async ({ ctx }) => AuthService.logout(ctx.session.id)),
  register: publicProcedure.input(z.object({ username: z.string(), password: z.string() })).mutation(async ({ input }) => AuthService.register({ ...input })),
  refreshToken: protectedProcedure.mutation(async ({ ctx }) => AuthService.refreshToken(ctx.session.id)),
  me: publicProcedure.query(async ({ ctx }) => AuthService.me(ctx.session?.userId)),
  isConfigured: publicProcedure.query(async () => AuthService.isConfigured()),
});
