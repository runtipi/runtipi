import { inferAsyncReturnType } from '@trpc/server';
import { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { getServerAuthSession } from './common/get-server-auth-session';

type Session = {
  userId?: number;
  id?: string;
};

type CreateContextOptions = {
  session: Session | null;
};

/**
 * Use this helper for:
 * - testing, so we dont have to mock Next.js' req/res
 * - trpc's `createSSGHelpers` where we don't have req/res
 *
 * @param {CreateContextOptions} opts - options
 * @see https://create.t3.gg/en/usage/trpc#-servertrpccontextts
 */
export const createContextInner = async (opts: CreateContextOptions) => ({
  session: opts.session,
});

/**
 * This is the actual context you'll use in your router
 *
 * @param {CreateNextContextOptions} opts - options
 */
export const createContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;

  // Get the session from the server using the unstable_getServerSession wrapper function
  const session = await getServerAuthSession({ req, res });

  return createContextInner({
    session,
  });
};

export type Context = inferAsyncReturnType<typeof createContext>;
