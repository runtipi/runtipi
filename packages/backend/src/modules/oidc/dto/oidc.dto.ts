import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

export const oidcProviderSchema = type({
  'id?': 'number',
  name: 'string',
  clientId: 'string',
  clientSecret: 'string',
  authorizeUri: 'string',
  tokenUri: 'string',
  userinfoUri: 'string',
});

export const oidcProviderPublicSchema = type({
  id: 'number',
  name: 'string',
});

export const oidcProviderAuthRes = type({
  url: 'string',
});

export const trustedSubSchema = type({
  sub: 'string',
  providerId: 'number',
  'createdAt?': 'number',
});

export const oidcProvidersSchema = type({
  providers: oidcProviderSchema.array(),
});

export const publicOidcProvidersSchema = type({
  providers: oidcProviderPublicSchema.array(),
});

export const trustedSubsSchema = type({
  subs: trustedSubSchema.array(),
});

export class OidcProviderDto extends createArkDto(oidcProviderSchema, { name: 'OidcProviderDto', input: true }) {}
export class OidcProvidersDto extends createArkDto(oidcProvidersSchema, { name: 'OidcProvidersDto' }) {}
export class PublicOidcProviderDto extends createArkDto(oidcProviderPublicSchema, { name: 'PublicOidcProviderDto' }) {}
export class PublicOidcProvidersDto extends createArkDto(publicOidcProvidersSchema, { name: 'PublicOidcProvidersDto' }) {}
export class OidcProviderAuthResDto extends createArkDto(oidcProviderAuthRes, { name: 'OidcProviderAuthResDto' }) {}
export class TrustedSubDto extends createArkDto(trustedSubSchema, { name: 'TrustedSubDto' }) {}
export class TrustedSubsDto extends createArkDto(trustedSubsSchema, { name: 'TrustedSubsDto' }) {}
