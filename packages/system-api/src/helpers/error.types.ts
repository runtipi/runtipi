import { ObjectType, Field } from 'type-graphql';

@ObjectType()
class FieldError {
  @Field()
  code!: number;

  @Field()
  message!: string;

  @Field({ nullable: true })
  field?: string;
}

@ObjectType()
class ErrorResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];
}

export { FieldError, ErrorResponse };
