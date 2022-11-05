import { Field, InputType, ObjectType } from 'type-graphql';

@InputType()
class UsernamePasswordInput {
  @Field(() => String)
  username!: string;

  @Field(() => String)
  password!: string;
}

@ObjectType()
class TokenResponse {
  @Field(() => String, { nullable: false })
  token!: string;
}

export { UsernamePasswordInput, TokenResponse };
