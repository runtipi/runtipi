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
    credentials = new AgentCredentialsService(db, new UserRepository(db), passwords, config);
  });

  beforeEach(async () => {
    await db.delete(agentCredential);
    config.get.calledWith('demoMode').mockReturnValue(false);
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

  it('allows TOTP setup preparation and invalidates credentials when TOTP is enabled', async () => {
    const created = await credentials.create(ownerId, { name: 'Agent', password, expiresInDays: 1 });
    await db.update(user).set({ totpSecret: 'prepared-secret' }).where(eq(user.id, ownerId));

    await expect(credentials.authenticate(`Bearer ${created.token}`)).resolves.toMatchObject({ user: { id: ownerId } });
    await db.update(user).set({ totpEnabled: true }).where(eq(user.id, ownerId));
    await expect(credentials.authenticate(`Bearer ${created.token}`)).rejects.toThrow('account has changed');
    await db.update(user).set({ totpEnabled: false, totpSecret: null }).where(eq(user.id, ownerId));
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
