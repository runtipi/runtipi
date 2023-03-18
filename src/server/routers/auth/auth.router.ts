import { z } from 'zod';
import { AuthServiceClass } from '../../services/auth/auth.service';
import { router, publicProcedure, protectedProcedure } from '../../trpc';
import { prisma } from '../../db/client';

const AuthService = new AuthServiceClass(prisma);

export const authRouter = router({
  // Public
  login: publicProcedure.input(z.object({ username: z.string(), password: z.string() })).mutation(async ({ input }) => AuthService.login({ ...input })),
  register: publicProcedure.input(z.object({ username: z.string(), password: z.string() })).mutation(async ({ input }) => AuthService.register({ ...input })),
  me: publicProcedure.query(async ({ ctx }) => AuthService.me(ctx.session?.userId)),
  isConfigured: publicProcedure.query(async () => AuthService.isConfigured()),
  checkPasswordChangeRequest: publicProcedure.query(AuthServiceClass.checkPasswordChangeRequest),
  resetPassword: publicProcedure.input(z.object({ newPassword: z.string() })).mutation(({ input }) => AuthService.changePassword({ newPassword: input.newPassword })),
  cancelPasswordChangeRequest: publicProcedure.mutation(AuthServiceClass.cancelPasswordChangeRequest),
  // Protected
  logout: protectedProcedure.mutation(async ({ ctx }) => AuthServiceClass.logout(ctx.session.id)),
  refreshToken: protectedProcedure.mutation(async ({ ctx }) => AuthServiceClass.refreshToken(ctx.session.id)),
});
