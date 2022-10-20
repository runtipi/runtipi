import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { MyContext } from '../../types';
import { TokenResponse, UsernamePasswordInput } from './auth.types';

import AuthService from './auth.service';
import User from './user.entity';

@Resolver()
export default class AuthResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() ctx: MyContext): Promise<User | null> {
    return AuthService.me(ctx.req?.session?.userId);
  }

  @Mutation(() => TokenResponse)
  async register(@Arg('input', () => UsernamePasswordInput) input: UsernamePasswordInput): Promise<TokenResponse> {
    const { token } = await AuthService.register(input);

    return { token };
  }

  @Mutation(() => TokenResponse)
  async login(@Arg('input', () => UsernamePasswordInput) input: UsernamePasswordInput): Promise<TokenResponse> {
    const { token } = await AuthService.login(input);

    return { token };
  }

  @Mutation(() => Boolean)
  async logout(@Ctx() { req }: MyContext): Promise<boolean> {
    await AuthService.logout(req.session?.id);
    req.session.userId = undefined;
    req.session.id = undefined;

    return true;
  }

  @Query(() => Boolean)
  async isConfigured(): Promise<boolean> {
    const users = await User.find();

    return users.length > 0;
  }

  @Query(() => TokenResponse, { nullable: true })
  async refreshToken(@Ctx() { req }: MyContext): Promise<TokenResponse | null> {
    const res = await AuthService.refreshToken(req.session?.id);

    return res;
  }
}
