import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { codes, idp, provider, setup } from './oidc.fixture';

beforeAll(() => idp.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  idp.resetHandlers();
  codes.clear();
  vi.useRealTimers();
});
afterAll(() => idp.close());

test('validates an OIDC code with PKCE and returns the linked local user and continuation', async () => {
  const { service, callback, responseFor } = setup();
  const authorization = await service.authorize(provider.slug, callback, { purpose: 'login', redirectUrl: 'https://app.tipi.example/private' });

  expect(new URL(authorization.url).searchParams.get('code_challenge_method')).toBe('S256');
  await expect(service.authenticate(provider.slug, responseFor(authorization), authorization.state, undefined)).resolves.toEqual({
    purpose: 'login',
    userId: 1,
    redirectUrl: 'https://app.tipi.example/private',
  });
});

test('links an identity only for the initiating user and browser session', async () => {
  const { service, callback, responseFor, repository } = setup();
  const actor = { userId: 1, sessionId: 'operator-session' };
  const authorization = await service.authorize(provider.slug, callback, { purpose: 'link', ...actor });

  await expect(service.authenticate(provider.slug, responseFor(authorization), authorization.state, actor)).resolves.toEqual({ purpose: 'link' });
  expect(repository.linkIdentity).toHaveBeenCalledWith(provider.id, provider.version, 'operator-subject', actor.userId);
});

test.each([undefined, 'another-browser-state'])('rejects a callback without its browser state (%s)', async (browserState) => {
  const { service, callback, responseFor, repository } = setup();
  const authorization = await service.authorize(provider.slug, callback, { purpose: 'login' });

  await expect(service.authenticate(provider.slug, responseFor(authorization), browserState, undefined)).rejects.toThrow(
    'browser transaction mismatch',
  );
  expect(repository.linkIdentity).not.toHaveBeenCalled();
});

test('rejects the attacker login callback when opened by an authenticated operator', async () => {
  const { service, callback, responseFor, repository } = setup();
  const authorization = await service.authorize(provider.slug, callback, { purpose: 'login' });

  await expect(
    service.authenticate(provider.slug, responseFor(authorization), authorization.state, { userId: 1, sessionId: 'victim-session' }),
  ).rejects.toThrow('Login cannot become account linking');
  expect(repository.linkIdentity).not.toHaveBeenCalled();
});

test.each([undefined, { userId: 2, sessionId: 'session' }, { userId: 1, sessionId: 'different-session' }])(
  'rejects a changed linking principal: %j',
  async (actor) => {
    const { service, callback, responseFor, repository } = setup();
    const authorization = await service.authorize(provider.slug, callback, { purpose: 'link', userId: 1, sessionId: 'session' });

    await expect(service.authenticate(provider.slug, responseFor(authorization), authorization.state, actor)).rejects.toThrow(
      'linking session changed',
    );
    expect(repository.linkIdentity).not.toHaveBeenCalled();
  },
);

test.each(['http://tipi.example', 'https://other.example'])('rejects a changed callback origin: %s', async (origin) => {
  const { service, callback, responseFor } = setup();
  const authorization = await service.authorize(provider.slug, callback, { purpose: 'login' });
  const response = responseFor(authorization);
  const changed = new URL(`${response.pathname}${response.search}`, origin);

  await expect(service.authenticate(provider.slug, changed, authorization.state, undefined)).rejects.toThrow('callback mismatch');
});

test('rejects provider substitution even with a genuine state and callback', async () => {
  const { service, callback, responseFor, repository } = setup();
  const authorization = await service.authorize(provider.slug, callback, { purpose: 'login' });
  repository.getOIDCProviderBySlug.mockResolvedValue({ ...provider, id: 2, slug: 'another' });

  await expect(service.authenticate('another', responseFor(authorization), authorization.state, undefined)).rejects.toThrow('provider changed');
});

test('rejects authorization started before a provider configuration change', async () => {
  const { service, callback, responseFor, repository } = setup();
  const authorization = await service.authorize(provider.slug, callback, { purpose: 'login' });
  repository.getOIDCProviderBySlug.mockResolvedValue({ ...provider, version: 2 });

  await expect(service.authenticate(provider.slug, responseFor(authorization), authorization.state, undefined)).rejects.toThrow('provider changed');
});

test('consumes authorization state once', async () => {
  const { service, callback, responseFor } = setup();
  const authorization = await service.authorize(provider.slug, callback, { purpose: 'login' });
  const response = responseFor(authorization);
  await service.authenticate(provider.slug, response, authorization.state, undefined);

  await expect(service.authenticate(provider.slug, response, authorization.state, undefined)).rejects.toThrow('expired or already used');
});

test('expires pending authorization after five minutes', async () => {
  const { service, callback, responseFor } = setup();
  const authorization = await service.authorize(provider.slug, callback, { purpose: 'login' });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.now() + 301_000);

  await expect(service.authenticate(provider.slug, responseFor(authorization), authorization.state, undefined)).rejects.toThrow(
    'expired or already used',
  );
});

test.each([{ nonce: 'wrong' }, { issuer: 'https://another-issuer.example' }, { audience: 'another-client' }])(
  'rejects mismatched ID-token claims: %j',
  async (claims) => {
    const { service, callback, responseFor, repository } = setup();
    const authorization = await service.authorize(provider.slug, callback, { purpose: 'login' });

    await expect(service.authenticate(provider.slug, responseFor(authorization, claims), authorization.state, undefined)).rejects.toThrow();
    expect(repository.getTrustedUserId).not.toHaveBeenCalled();
  },
);

test('rejects duplicate state parameters', async () => {
  const { service, callback, responseFor } = setup();
  const authorization = await service.authorize(provider.slug, callback, { purpose: 'login' });
  const response = responseFor(authorization);
  response.searchParams.append('state', authorization.state);

  await expect(service.authenticate(provider.slug, response, authorization.state, undefined)).rejects.toThrow('browser transaction mismatch');
});

test('uses the configured custom metadata URL literally and preserves the declared issuer', async () => {
  const { service, callback, repository } = setup();
  const discovery = 'https://idp.example/oidc/metadata';
  repository.getOIDCProviderBySlug.mockResolvedValue({ ...provider, discovery });
  idp.use(
    http.get(discovery, () =>
      HttpResponse.json({
        issuer: provider.issuer,
        authorization_endpoint: `${provider.issuer}/authorize`,
        token_endpoint: `${provider.issuer}/token`,
        jwks_uri: `${provider.issuer}/jwks`,
      }),
    ),
  );

  const authorization = await service.authorize(provider.slug, callback, { purpose: 'login' });

  expect(new URL(authorization.url).origin).toBe(provider.issuer);
});

test('rejects an ID token whose signature does not match the issuer key', async () => {
  const { service, callback, responseFor, repository } = setup();
  const authorization = await service.authorize(provider.slug, callback, { purpose: 'login' });

  await expect(
    service.authenticate(provider.slug, responseFor(authorization, { invalidSignature: true }), authorization.state, undefined),
  ).rejects.toThrow();
  expect(repository.getTrustedUserId).not.toHaveBeenCalled();
});
