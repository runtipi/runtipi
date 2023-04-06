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
  // Password
  checkPasswordChangeRequest: publicProcedure.query(AuthServiceClass.checkPasswordChangeRequest),
  resetPassword: publicProcedure.input(z.object({ newPassword: z.string() })).mutation(({ input }) => AuthService.changeOperatorPassword({ newPassword: input.newPassword })),
  cancelPasswordChangeRequest: publicProcedure.mutation(AuthServiceClass.cancelPasswordChangeRequest),
  // Totp
  verifyTotp: publicProcedure.input(z.object({ totpSessionId: z.string(), totpCode: z.string() })).mutation(({ input }) => AuthService.verifyTotp(input)),
  getTotpUri: protectedProcedure.input(z.object({ password: z.string() })).mutation(({ input, ctx }) => AuthService.getTotpUri({ userId: Number(ctx.session.userId), password: input.password })),
  setupTotp: protectedProcedure.input(z.object({ totpCode: z.string() })).mutation(({ input, ctx }) => AuthService.setupTotp({ userId: Number(ctx.session.userId), totpCode: input.totpCode })),
  disableTotp: protectedProcedure.input(z.object({ password: z.string() })).mutation(({ input, ctx }) => AuthService.disableTotp({ userId: Number(ctx.session.userId), password: input.password })),
});
