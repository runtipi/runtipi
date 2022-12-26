import { z } from 'zod';
import AuthService from '../../services/auth/auth.service';
import { router, publicProcedure, protectedProcedure } from '../../trpc';

export const authRouter = router({
  login: publicProcedure.input(z.object({ username: z.string(), password: z.string() })).mutation(async ({ ctx, input }) => AuthService.login({ ...input }, ctx)),
  logout: protectedProcedure.mutation(async ({ ctx }) => AuthService.logout(ctx.session.id)),
  register: publicProcedure.input(z.object({ username: z.string(), password: z.string() })).mutation(async ({ ctx, input }) => AuthService.register({ ...input }, ctx)),
  refreshToken: protectedProcedure.mutation(async ({ ctx }) => AuthService.refreshToken(ctx.session.id)),
  me: publicProcedure.query(async ({ ctx }) => AuthService.me(ctx)),
  isConfigured: publicProcedure.query(async ({ ctx }) => AuthService.isConfigured(ctx)),
});
