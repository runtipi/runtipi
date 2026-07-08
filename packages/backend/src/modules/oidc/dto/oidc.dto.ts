import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

export const OIDCProviderSchema = type({
  id: 'number',
  userId: 'number',
  slug: 'string >= 1',
  displayName: 'string >= 1',
  clientId: 'string >= 1',
  clientSecret: 'string >= 1',
  authorizeUrl: 'string.url',
  tokenUrl: 'string.url',
  userInfoUrl: 'string.url',
  createdAt: 'number',
  updatedAt: 'number',
});

export class OIDCProviderDto extends createArkDto(OIDCProviderSchema, { name: 'OIDCProviderDto' }) {}

export const CreateOIDCProviderSchema = type({
  slug: 'string >= 1',
  displayName: 'string >= 1',
  clientId: 'string >= 1',
  clientSecret: 'string >= 1',
  authorizeUrl: 'string.url',
  tokenUrl: 'string.url',
  userInfoUrl: 'string.url',
});

export class CreateOIDCProviderDto extends createArkDto(CreateOIDCProviderSchema, { name: 'CreateOIDCProviderDto' }) {}

export const EditOIDCProviderSchema = type({
  displayName: 'string >= 1',
  clientId: 'string >= 1',
  clientSecret: 'string >= 1',
  authorizeUrl: 'string.url',
  tokenUrl: 'string.url',
  userInfoUrl: 'string.url',
});

export class EditOIDCProviderDto extends createArkDto(EditOIDCProviderSchema, { name: 'EditOIDCProviderDto' }) {}

export const TrustedSubSchema = type({
  slug: 'string',
  sub: 'string',
  providerDisplayName: 'string',
  createdAt: 'number',
});

export class TrustedSubDto extends createArkDto(TrustedSubSchema, { name: 'TrustedSubDto' }) {}

export const TrustedSubsSchema = type({
  subs: TrustedSubSchema.array(),
});

export class TrustedSubsDto extends createArkDto(TrustedSubsSchema, { name: 'TrustedSubsDto' }) {}

export const GetOIDCProviderSchema = type({
  slug: 'string >= 1',
  displayName: 'string >= 1',
  clientId: 'string >= 1',
  clientSecret: 'string >= 1',
  authorizeUrl: 'string.url',
  tokenUrl: 'string.url',
  userInfoUrl: 'string.url',
});

export class GetOIDCProviderDto extends createArkDto(GetOIDCProviderSchema, { name: 'GetOIDCProviderDto' }) {}

export const GetOIDCProvidersSchema = type({
  providers: GetOIDCProviderSchema.array(),
});

export class GetOIDCProvidersDto extends createArkDto(GetOIDCProvidersSchema, { name: 'GetOIDCProvidersDto' }) {}

export const OIDCProviderLoginSchema = type({
  slug: 'string >= 1',
  displayName: 'string >= 1',
});

export class OIDCProviderLoginDto extends createArkDto(OIDCProviderLoginSchema, { name: 'OIDCProviderLoginDto' }) {}

export const OIDCProvidersLoginSchema = type({
  providers: OIDCProviderLoginSchema.array(),
});

export class OIDCProvidersLoginDto extends createArkDto(OIDCProvidersLoginSchema, { name: 'OIDCProvidersLoginDto' }) {}

export const GetOIDCProviderURLSchema = type({
  slug: 'string',
  url: 'string.url',
});

export class GetOIDCProviderURLDto extends createArkDto(GetOIDCProviderURLSchema, { name: 'GetOIDCProviderURLDto' }) {}
