import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { CacheService } from '@/core/cache/cache.service';
import { http, HttpResponse, passthrough } from 'msw';
import { setupServer } from 'msw/node';
import { mock } from 'vitest-mock-extended';
import { OIDCRepository } from '../oidc.repository';
import { OIDCService } from '../oidc.service';

export const provider = {
  id: 1,
  version: 1,
  userId: 1,
  slug: 'example',
  displayName: 'Example',
  clientId: 'runtipi',
  clientSecret: 'test-client-secret',
  issuer: 'https://idp.example',
  discovery: 'https://idp.example/.well-known/openid-configuration',
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

export const codes = new Map<
  string,
  { nonce: string; challenge: string; sub: string; issuer?: string; audience?: string; invalidSignature?: boolean }
>();

export const idp = setupServer(
  http.all(/^http:\/\/127\.0\.0\.1(?::\d+)?\//, () => passthrough()),
  http.get(provider.discovery, () =>
    HttpResponse.json({
      issuer: provider.issuer,
      authorization_endpoint: `${provider.issuer}/authorize`,
      token_endpoint: `${provider.issuer}/token`,
      jwks_uri: `${provider.issuer}/jwks`,
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: ['client_secret_post'],
      code_challenge_methods_supported: ['S256'],
    }),
  ),
  http.get(`${provider.issuer}/jwks`, () => HttpResponse.json({ keys: [jwk] })),
  http.post(`${provider.issuer}/token`, async ({ request }) => {
    const body = new URLSearchParams(await request.text());
    const code = body.get('code') ?? '';
    const authorization = codes.get(code);
    codes.delete(code);

    const challenge = createHash('sha256')
      .update(body.get('code_verifier') ?? '')
      .digest('base64url');
    if (!authorization || challenge !== authorization.challenge || body.get('client_secret') !== provider.clientSecret) {
      return HttpResponse.json({ error: 'invalid_grant' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = `${encode({ alg: 'RS256', kid: jwk.kid })}.${encode({
      iss: authorization.issuer ?? provider.issuer,
      aud: authorization.audience ?? provider.clientId,
      sub: authorization.sub,
      nonce: authorization.nonce,
      iat: now,
      exp: now + 300,
    })}`;
    const signature = sign('RSA-SHA256', Buffer.from(payload), privateKey);
    if (authorization.invalidSignature) signature[0] = (signature[0] ?? 0) ^ 1;

    return HttpResponse.json({ access_token: 'test-access-token', token_type: 'Bearer', id_token: `${payload}.${signature.toString('base64url')}` });
  }),
);

export const setup = () => {
  const repository = mock<OIDCRepository>();
  repository.getOIDCProviderBySlug.mockResolvedValue({ ...provider });
  repository.getTrustedUserId.mockResolvedValue(1);
  const entries = new Map<string, { value: string; expires: number }>();
  const cache = mock<CacheService>();
  cache.set.mockImplementation((key, value, ttl = 86400) => {
    entries.set(key, { value, expires: Date.now() + ttl * 1000 });
  });
  cache.take.mockImplementation((key) => {
    const entry = entries.get(key);
    entries.delete(key);

    return entry && entry.expires >= Date.now() ? entry.value : undefined;
  });

  const service = new OIDCService(repository, cache);
  const callback = new URL('https://tipi.example/api/oidc/providers/example/callback');
  const responseFor = (
    authorization: { state: string; url: string },
    claims: Partial<{ nonce: string; issuer: string; audience: string; invalidSignature: boolean }> = {},
  ) => {
    const params = new URL(authorization.url).searchParams;
    const code = randomUUID();
    codes.set(code, { nonce: params.get('nonce') ?? '', challenge: params.get('code_challenge') ?? '', sub: 'operator-subject', ...claims });
    const response = new URL(callback);
    response.search = new URLSearchParams({ code, state: authorization.state }).toString();

    return response;
  };

  return { repository, cache, service, callback, responseFor };
};
