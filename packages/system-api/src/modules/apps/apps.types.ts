import { AppCategoriesEnum, FieldTypes } from '@runtipi/common';
import { Field, InputType, ObjectType, registerEnumType } from 'type-graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import App from './app.entity';

registerEnumType(AppCategoriesEnum, {
  name: 'AppCategoriesEnum',
});

registerEnumType(FieldTypes, {
  name: 'FieldTypesEnum',
});

@ObjectType()
class FormField {
  @Field(() => FieldTypes)
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
class AppInfo {
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

  @Field(() => String, { nullable: true })
  url_suffix?: string;

  @Field(() => [FormField])
  form_fields?: FormField[];
}

@ObjectType()
class ListAppsResonse {
  @Field(() => [AppInfo])
  apps!: AppInfo[];

  @Field(() => Number)
  total!: number;
}

@ObjectType()
class AppResponse {
  @Field(() => App, { nullable: true })
  app!: App | null;

  @Field(() => AppInfo)
  info!: AppInfo;
}

@InputType()
class AppInputType {
  @Field(() => String)
  id!: string;

  @Field(() => GraphQLJSONObject)
  form!: Record<string, string>;
}

export { ListAppsResonse, AppInfo, AppInputType, AppResponse };
