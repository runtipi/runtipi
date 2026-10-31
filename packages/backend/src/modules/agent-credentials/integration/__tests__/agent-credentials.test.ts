import { createTestCache } from '@/core/cache/__tests__/cache-test-utils';
import { createHash } from 'node:crypto';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { PasswordConfirmationService } from '@/core/password/password-confirmation.service';
import { AuthService } from '@/modules/auth/auth.service';
import { SessionManager } from '@/modules/auth/session.manager';
import { TotpAuthenticator } from '@/modules/auth/utils/totp-authenticator';
import { EncryptionService } from '@/core/encryption/encryption.service';
import { FilesystemService } from '@/core/filesystem/filesystem.service';
import { LoggerService } from '@/core/logger/logger.service';
import { LinksService } from '@/modules/links/links.service';
import { McpAccountTools } from '@/modules/mcp/account-tools';
import { ToolRegistry } from '@/modules/mcp/tool-registry';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { eq } from 'drizzle-orm';
import { ConfigurationService } from '@/core/config/configuration.service';
import { agentCredential, user } from '@/core/database/drizzle/schema';
import { PasswordService } from '@/core/password/password.service';
import { UserRepository } from '@/modules/user/user.repository';
import { createTestDatabase, dropTestDatabase, type TestDatabase } from '@/tests/utils/create-test-database';
import { AgentCredentialsService } from '../../agent-credentials.service';

vi.unmock('fs');
vi.unmock('node:fs');

const databaseName = `mcp_credentials_${process.pid}`;

describe('persistent agent credentials', () => {
  let db: TestDatabase;
  let credentials: AgentCredentialsService;
  let users: UserRepository;
  let confirmation: PasswordConfirmationService;
  let auth: AuthService;
  let ownerId: number;
  let otherUserId: number;
  const config = mock<ConfigurationService>();
  const password = 'test-account-password';
  const passwords = new PasswordService();

  beforeAll(async () => {
    db = await createTestDatabase(databaseName);
    const hash = await passwords.hash(password);
    const accounts = await db
      .insert(user)
      .values([
        { username: 'owner@example.com', password: hash, operator: true },
        { username: 'other@example.com', password: hash },
      ])
      .returning();
    ownerId = accounts[0]!.id;
    otherUserId = accounts[1]!.id;
    users = new UserRepository(db);
  });

  beforeEach(async () => {
    await db.delete(agentCredential);
    config.get.calledWith('demoMode').mockReturnValue(false);
    const cache = createTestCache().cache;
    confirmation = new PasswordConfirmationService(cache, passwords);
    credentials = new AgentCredentialsService(db, users, confirmation, config);
    const encryption = mock<EncryptionService>();
    encryption.encrypt.mockImplementation((secret) => secret);
    encryption.decrypt.mockImplementation((secret) => secret);
    const sessions = mock<SessionManager>();
    sessions.generateSalt.mockReturnValue('fixture-salt');
    auth = new AuthService(users, sessions, config, encryption, cache, mock<FilesystemService>(), passwords, confirmation);
    await db.update(user).set({ totpEnabled: false, totpSecret: null, username: 'owner@example.com' }).where(eq(user.id, ownerId));
  });

  afterAll(async () => {
    if (db) await db.$client.end();
    await dropTestDatabase(databaseName);
  });

  it('stores only a digest and authenticates as the issuing user', async () => {
    const created = await credentials.create(ownerId, { name: 'My agent', password, expiresInDays: 90 });
    const stored = await db.select().from(agentCredential);
    const identity = await credentials.authenticate(`Bearer ${created.token}`);

    expect(identity.user.id).toBe(ownerId);
    expect(identity.credentialId).toBe(created.credential!.id);
    expect(stored[0]!.tokenHash).toHaveLength(64);
    expect(JSON.stringify(stored)).not.toContain(created.token);
    expect(await credentials.list(ownerId)).toEqual([expect.objectContaining({ name: 'My agent', lastUsedAt: expect.any(Number) })]);
    expect(JSON.stringify(await credentials.list(ownerId))).not.toContain('tokenHash');
  });

  it('enforces ownership for listing and revocation', async () => {
    const created = await credentials.create(ownerId, { name: 'Agent', password, expiresInDays: 1 });

    expect(await credentials.list(otherUserId)).toEqual([]);
    await credentials.revoke(otherUserId, created.credential!.id);
    await expect(credentials.authenticate(`Bearer ${created.token}`)).resolves.toMatchObject({ user: { id: ownerId } });

    await credentials.revoke(ownerId, created.credential!.id);
    await expect(credentials.authenticate(`Bearer ${created.token}`)).rejects.toThrow('Invalid or expired');
  });

  it('rejects expired and unknown credentials', async () => {
    const created = await credentials.create(ownerId, { name: 'Expired', password, expiresInDays: 1 });
    await db.update(agentCredential).set({ expiresAt: 1 });

    await expect(credentials.authenticate(`Bearer ${created.token}`)).rejects.toThrow('Invalid or expired');
    await expect(credentials.authenticate(`Bearer ${created.token.slice(0, -1)}x`)).rejects.toThrow();
  });

  it('invalidates credentials after an account password change', async () => {
    const created = await credentials.create(ownerId, { name: 'Agent', password, expiresInDays: 1 });
    const [account] = await db.select().from(user).where(eq(user.id, ownerId));
    await db.update(user).set({ password: 'changed-password-hash' }).where(eq(user.id, ownerId));

    await expect(credentials.authenticate(`Bearer ${created.token}`)).rejects.toThrow('account has changed');
    await db.update(user).set({ password: account!.password }).where(eq(user.id, ownerId));
  });

  it('preserves setup preparation but never revives credentials after a TOTP round trip', async () => {
    const original = await credentials.create(ownerId, { name: 'Before TOTP', password, expiresInDays: 1 });
    const prepared = await auth.getTotpUri({ userId: ownerId, password });

    await expect(credentials.authenticate(`Bearer ${original.token}`)).resolves.toMatchObject({ user: { id: ownerId } });
    await auth.setupTotp({ userId: ownerId, totpCode: TotpAuthenticator.generate(prepared.key) });
    await expect(credentials.authenticate(`Bearer ${original.token}`)).rejects.toThrow('Invalid or expired');
    const enabled = await credentials.create(ownerId, { name: 'With TOTP', password, expiresInDays: 1 });
    await auth.disableTotp({ userId: ownerId, password });

    await expect(credentials.authenticate(`Bearer ${original.token}`)).rejects.toThrow('Invalid or expired');
    await expect(credentials.authenticate(`Bearer ${enabled.token}`)).rejects.toThrow('Invalid or expired');
    const fresh = await credentials.create(ownerId, { name: 'After TOTP', password, expiresInDays: 1 });
    await expect(credentials.authenticate(`Bearer ${fresh.token}`)).resolves.toMatchObject({ user: { id: ownerId } });
  });

  it('permanently revokes credentials on username round trips and preserves locale changes', async () => {
    const created = await credentials.create(ownerId, { name: 'Agent', password, expiresInDays: 1 });
    await users.updateUser(ownerId, { locale: 'fr', hasSeenWelcome: true });
    await expect(credentials.authenticate(`Bearer ${created.token}`)).resolves.toMatchObject({ user: { id: ownerId } });
    await auth.changeUsername({ userId: ownerId, password, newUsername: 'renamed@example.com' });
    await auth.changeUsername({ userId: ownerId, password, newUsername: 'owner@example.com' });

    await expect(credentials.authenticate(`Bearer ${created.token}`)).rejects.toThrow('Invalid or expired');
  });

  it('permanently revokes credentials on password reset even when the old hash is restored', async () => {
    const created = await credentials.create(ownerId, { name: 'Agent', password, expiresInDays: 1 });
    const account = await users.getUserById(ownerId);
    await users.updateUser(ownerId, { password: 'reset-hash', totpEnabled: false, totpSecret: null });
    await users.updateUser(ownerId, { password: account!.password });

    await expect(credentials.authenticate(`Bearer ${created.token}`)).rejects.toThrow('Invalid or expired');
  });

  it('rejects pre-fix fingerprints even if their account state matches again', async () => {
    const created = await credentials.create(ownerId, { name: 'Legacy', password, expiresInDays: 1 });
    const account = await users.getUserById(ownerId);
    const legacyFingerprint = createHash('sha256')
      .update(JSON.stringify([account!.username, account!.password, account!.totpEnabled]))
      .digest('hex');
    await db.update(agentCredential).set({ accountFingerprint: legacyFingerprint });

    await expect(credentials.authenticate(`Bearer ${created.token}`)).rejects.toThrow('account has changed');
  });

  it('serializes credential issuance with account security mutation', async () => {
    let verifying!: () => void;
    let resume!: (valid: boolean) => void;
    const entered = new Promise<void>((resolve) => {
      verifying = resolve;
    });
    const verify = vi.spyOn(confirmation, 'verify').mockImplementationOnce(() => {
      verifying();
      return new Promise((resolve) => {
        resume = resolve;
      });
    });
    const creating = credentials.create(ownerId, { name: 'Racing agent', password, expiresInDays: 1 });
    await entered;
    const changing = users.updateUser(ownerId, { totpEnabled: true });
    resume(true);
    const created = await creating;
    await changing;
    verify.mockRestore();
    await users.updateUser(ownerId, { totpEnabled: false });

    await expect(credentials.authenticate(`Bearer ${created.token}`)).rejects.toThrow('Invalid or expired');
  });

  it('shares the MCP password oracle budget across credentials, tools and dashboard issuance', async () => {
    await users.updateUser(ownerId, { totpEnabled: true });
    const first = await credentials.create(ownerId, { name: 'First', password, expiresInDays: 1 });
    const second = await credentials.create(ownerId, { name: 'Second', password, expiresInDays: 1 });
    const tools = new McpAccountTools(auth, mock<LinksService>());
    const identity = await credentials.authenticate(`Bearer ${first.token}`);
    const alternate = await credentials.authenticate(`Bearer ${second.token}`);
    const handler = createMcpHandler(() => {
      const server = new McpServer({ name: 'account-test', version: '1.0.0' });
      tools.register(new ToolRegistry(server, identity, mock<LoggerService>()), identity);
      return server;
    });
    const otherHandler = createMcpHandler(() => {
      const server = new McpServer({ name: 'alternate-test', version: '1.0.0' });
      tools.register(new ToolRegistry(server, alternate, mock<LoggerService>()), alternate);
      return server;
    });
    const clients = await Promise.all(
      [handler, otherHandler].map(async (endpoint) => {
        const client = new Client({ name: 'agent', version: '1.0.0' });
        await client.connect(
          new StreamableHTTPClientTransport(new URL('http://localhost/api/mcp'), {
            fetch: (url, init) => endpoint.fetch(new Request(String(url), init)),
          }),
        );
        return client;
      }),
    );

    try {
      const legitimate = await clients[0]!.callTool({ name: 'change_username', arguments: { password, newUsername: identity.user.username } });
      expect(JSON.stringify(legitimate)).toContain('AUTH_ERROR_USER_ALREADY_EXISTS');
      const guesses = [
        { name: 'change_username', arguments: { password: 'wrong', newUsername: identity.user.username } },
        { name: 'change_password', arguments: { currentPassword: 'wrong', newPassword: 'replacement-password' } },
        { name: 'get_totp_setup', arguments: { password: 'wrong' } },
        { name: 'disable_totp', arguments: { password: 'wrong' } },
        { name: 'change_username', arguments: { password: 'wrong', newUsername: identity.user.username } },
      ];
      for (const [index, guess] of guesses.entries()) {
        const result = await clients[index % clients.length]!.callTool(guess);
        expect(JSON.stringify(result)).toContain('AUTH_ERROR_INVALID_PASSWORD');
      }
      const blocked = await clients[1]!.callTool({ name: 'change_username', arguments: { password, newUsername: identity.user.username } });
      expect(JSON.stringify(blocked)).toContain('AUTH_ERROR_PASSWORD_TOO_MANY_ATTEMPTS');
      expect(JSON.stringify(blocked)).not.toContain('AUTH_ERROR_USER_ALREADY_EXISTS');
      await expect(credentials.create(ownerId, { name: 'Blocked', password, expiresInDays: 1 })).rejects.toMatchObject({ status: 429 });
      await expect(auth.getTotpUri({ userId: otherUserId, password })).resolves.toHaveProperty('uri');
    } finally {
      await Promise.all(clients.map((client) => client.close()));
      await Promise.all([handler.close(), otherHandler.close()]);
    }
  });

  it('requires password confirmation and rejects CLI credentials', async () => {
    await expect(credentials.create(ownerId, { name: 'Agent', password: 'wrong', expiresInDays: 1 })).rejects.toThrow('Invalid password');
    await expect(credentials.authenticate('Bearer cli-token')).rejects.toThrow('agent bearer token');
    expect(await credentials.list(ownerId)).toEqual([]);
  });

  it('refuses credential creation in demo mode', async () => {
    config.get.calledWith('demoMode').mockReturnValue(true);

    await expect(credentials.create(ownerId, { name: 'Agent', password, expiresInDays: 1 })).rejects.toThrow('demo mode');
  });
});
