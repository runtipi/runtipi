import { inferAsyncReturnType } from '@trpc/server';
import { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { Locale } from '@/shared/internationalization/locales';

type Session = {
  userId?: number;
  locale?: Locale;
};

type CreateContextOptions = {
  req: CreateNextContextOptions['req'] & {
    session?: Session;
  };
  res: CreateNextContextOptions['res'];
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

  return createContextInner({
    req,
    res,
  });
};

export type Context = inferAsyncReturnType<typeof createContext>;
