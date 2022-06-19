import { AppCategoriesEnum, AppStatusEnum, FieldTypes } from '@runtipi/common';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
class FormField {
  @Field(() => String)
  type!: FieldTypes;

  @Field(() => String)
  label!: string;

  @Field(() => Number, { nullable: true })
  max?: number;

  @Field(() => Number, { nullable: true })
  min?: number;

  @Field(() => String, { nullable: true })
  hint?: string;

  @Field(() => Boolean, { nullable: true })
  required?: boolean;

  @Field(() => String)
  env_variable!: string;
}

@ObjectType()
class AppConfig {
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

  @Field(() => [String])
  categories!: AppCategoriesEnum[];

  @Field(() => String)
  status!: AppStatusEnum;

  @Field(() => String, { nullable: true })
  url_suffix?: string;

  @Field(() => [FormField])
  form_fields?: FormField[];
}

@ObjectType()
class ListAppsResonse {
  @Field(() => [AppConfig])
  apps!: AppConfig[];

  @Field(() => Number)
  total!: number;
}

export { ListAppsResonse, AppConfig };
