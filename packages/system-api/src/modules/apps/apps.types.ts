import { Field, InputType, ObjectType, registerEnumType } from 'type-graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

export enum AppCategoriesEnum {
  NETWORK = 'network',
  MEDIA = 'media',
  DEVELOPMENT = 'development',
  AUTOMATION = 'automation',
  SOCIAL = 'social',
  UTILITIES = 'utilities',
  PHOTOGRAPHY = 'photography',
  SECURITY = 'security',
  FEATURED = 'featured',
  BOOKS = 'books',
  DATA = 'data',
  MUSIC = 'music',
  FINANCE = 'finance',
}

export enum FieldTypes {
  text = 'text',
  password = 'password',
  email = 'email',
  number = 'number',
  fqdn = 'fqdn',
  ip = 'ip',
  fqdnip = 'fqdnip',
  url = 'url',
  random = 'random',
}

export enum AppStatusEnum {
  RUNNING = 'running',
  STOPPED = 'stopped',
  INSTALLING = 'installing',
  UNINSTALLING = 'uninstalling',
  STOPPING = 'stopping',
  STARTING = 'starting',
  MISSING = 'missing',
}

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
class Requirements {
  @Field(() => [Number], { nullable: true })
  ports?: number[];
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

  @Field(() => [AppCategoriesEnum])
  categories!: AppCategoriesEnum[];

  @Field(() => String, { nullable: true })
  url_suffix?: string;

  @Field(() => [FormField])
  form_fields?: FormField[];

  @Field(() => GraphQLJSONObject, { nullable: true })
  requirements?: Requirements;
}

@ObjectType()
class ListAppsResonse {
  @Field(() => [AppInfo])
  apps!: AppInfo[];

  @Field(() => Number)
  total!: number;
}

@InputType()
class AppInputType {
  @Field(() => String)
  id!: string;

  @Field(() => GraphQLJSONObject)
  form!: Record<string, string>;
}

export { ListAppsResonse, AppInfo, AppInputType };
