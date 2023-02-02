import * as trpcNext from '@trpc/server/adapters/next';
import { createContext } from '../../../server/context';
import { mainRouter } from '../../../server/routers/_app';

// export API handler
export default trpcNext.createNextApiHandler({
  router: mainRouter,
  createContext,
});
