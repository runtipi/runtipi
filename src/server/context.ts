import { inferAsyncReturnType } from '@trpc/server';
import { CreateNextContextOptions } from '@trpc/server/adapters/next';
import TipiCache from './core/TipiCache/TipiCache';

type CreateContextOptions = {
  req: CreateNextContextOptions['req'];
  res: CreateNextContextOptions['res'];
  sessionId: string;
  userId?: number;
};

/**
 * Use this helper for:
 * - testing, so we dont have to mock Next.js' req/res
 * - trpc's `createSSGHelpers` where we don't have req/res
 *
 * @param {CreateContextOptions} opts - options
 * @see https://create.t3.gg/en/usage/trpc#-servertrpccontextts
 */
const createContextInner = async (opts: CreateContextOptions) => ({
  ...opts,
});

/**
 * This is the actual context you'll use in your router
 *
 * @param {CreateNextContextOptions} opts - options
 */
export const createContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;

  const sessionId = req.headers['x-session-id'] as string;

  const userId = await TipiCache.get(`session:${sessionId}`);

  return createContextInner({
    req,
    res,
    sessionId,
    userId: Number(userId) || undefined,
  });
};

export type Context = inferAsyncReturnType<typeof createContext>;
