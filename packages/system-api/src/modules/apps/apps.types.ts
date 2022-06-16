import { AppCategoriesEnum, AppStatusEnum } from '@runtipi/common';
import { Field, ObjectType } from 'type-graphql';

// @ObjectType(() => FormField)
// class FormField {
//   @Field()
//   type!: FieldTypes;

//   @Field()
//   label!: string;

//   @Field({ nullable: true })
//   max?: number;

//   @Field({ nullable: true })
//   min?: number;

//   @Field({ nullable: true })
//   hint?: string;

//   @Field({ nullable: true })
//   required?: boolean;

//   @Field()
//   env_variable!: string;
// }

@ObjectType()
class App {
  @Field(() => String)
  id!: string;

  @Field(() => Boolean)
  available!: boolean;

  @Field(() => Number)
  port!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String, { nullable: true })
  version?: string;

  @Field(() => String)
  image!: string;

  @Field(() => String)
  short_desc!: string;

  @Field(() => String)
  author!: string;

  @Field(() => String)
  source!: string;

  @Field(() => Boolean)
  installed!: boolean;

  @Field(() => [AppCategoriesEnum])
  categories!: AppCategoriesEnum[];

  @Field(() => AppStatusEnum)
  status!: AppStatusEnum;

  @Field(() => String, { nullable: true })
  url_suffix?: string;

  // @Field(() => [FormField])
  // form_fields?: FormField[];
}

@ObjectType()
class ListAppsResonse {
  @Field(() => [App])
  apps!: App[];
}

export { ListAppsResonse, App };
