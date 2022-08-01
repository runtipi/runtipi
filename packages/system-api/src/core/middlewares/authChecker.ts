import { AuthChecker } from 'type-graphql';
import User from '../../modules/auth/user.entity';
import { MyContext } from '../../types';

export const customAuthChecker: AuthChecker<MyContext> = async ({ context }) => {
  // here we can read the user from context
  // and check his permission in the db against the `roles` argument
  // that comes from the `@Authorized` decorator, eg. ["ADMIN", "MODERATOR"]
  if (!context.req?.session?.userId) {
    return false;
  }

  const { userId } = context.req.session;
  const user = await User.findOne({ where: { id: userId } });

  if (!user) {
    return false;
  }

  return true;
};
