import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { MyContext } from '../../types';
import { UsernamePasswordInput, UserResponse } from './auth.types';

import AuthService from './auth.service';
import User from './user.entity';

@Resolver()
export default class AuthResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() ctx: MyContext): Promise<User | null> {
    const user = await AuthService.me(ctx.req.session.userId);

    return user;
  }

  @Mutation(() => UserResponse)
  async register(@Arg('input', () => UsernamePasswordInput) input: UsernamePasswordInput, @Ctx() { req }: MyContext): Promise<UserResponse> {
    const { user } = await AuthService.register(input);

    if (user) {
      req.session.userId = user.id;
    }

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(@Arg('input', () => UsernamePasswordInput) input: UsernamePasswordInput, @Ctx() { req }: MyContext): Promise<UserResponse> {
    const { user } = await AuthService.login(input);

    if (user) {
      req.session.userId = user.id;
    }

    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req }: MyContext): boolean {
    req.session.userId = undefined;

    return true;
  }

  @Query(() => Boolean)
  async isConfigured(): Promise<boolean> {
    const users = await User.find();

    return users.length > 0;
  }
}
