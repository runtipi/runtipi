import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import * as schema from '@/core/database/drizzle/schema';
import { CreateOIDCProviderDto, EditOIDCProviderDto } from '../../dto/oidc.dto';
import { OIDCRepository } from '../../oidc.repository';

const databaseUrl = process.env.OIDC_TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('OIDC persistence against PostgreSQL', () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  const repository = new OIDCRepository(db);
  const input = CreateOIDCProviderDto.parseUnknown({
    slug: 'example',
    displayName: 'Example',
    clientId: 'runtipi',
    clientSecret: 'private-secret',
    issuer: 'https://idp.example',
    discovery: 'https://idp.example/.well-known/openid-configuration',
  });

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../../../core/database/drizzle', import.meta.url)) });
  });
  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE "user" RESTART IDENTITY CASCADE`);
  });
  afterAll(() => pool.end());

  const setup = async () => {
    const [owner, other] = await db
      .insert(schema.user)
      .values([
        { username: 'operator@example.com', password: 'hash', operator: true },
        { username: 'other@example.com', password: 'hash' },
      ])
      .returning();
    if (!owner || !other) throw new Error('Test users missing');

    await repository.createOIDCProvider(input, owner.id);
    const provider = await repository.getOIDCProviderBySlug(input.slug);

    return { owner, other, provider };
  };

  test('migrated foreign keys and unique constraints match the names used by schema changes', async () => {
    const { rows } = await pool.query<{ name: string }>(`
      SELECT constraint_name.conname AS name
      FROM pg_constraint AS constraint_name
      JOIN pg_class AS table_name ON table_name.oid = constraint_name.conrelid
      JOIN pg_namespace AS namespace ON namespace.oid = table_name.relnamespace
      WHERE namespace.nspname = 'public'
        AND table_name.relname IN ('oidc_providers', 'oidc_trusted_subs')
        AND constraint_name.contype IN ('f', 'u')
    `);
    const expectedNames = [schema.oidcProviders, schema.oidcTrustedSubs].flatMap((table) => {
      const config = getTableConfig(table);

      return [
        ...config.foreignKeys.map((key) => key.getName()),
        ...config.uniqueConstraints.map((constraint) => constraint.getName()),
        ...config.columns.filter((column) => column.isUnique).map((column) => column.uniqueName),
      ];
    });

    expect(rows.map((row) => row.name).sort()).toEqual(expectedNames.sort());
  });

  test('public and administrative projections keep client secrets server-side', async () => {
    const { owner } = await setup();

    expect(await repository.getOIDCProviders()).toEqual([{ slug: input.slug, displayName: input.displayName }]);
    const [admin] = await repository.getOIDCProvidersForUser(owner.id);
    expect(admin).not.toHaveProperty('clientSecret');
  });

  test('concurrent links are idempotent and subjects with identical suffixes stay distinct', async () => {
    const { owner, provider } = await setup();
    await Promise.all([
      repository.linkIdentity(provider.id, provider.version, 'first-abcd', owner.id),
      repository.linkIdentity(provider.id, provider.version, 'first-abcd', owner.id),
      repository.linkIdentity(provider.id, provider.version, 'second-abcd', owner.id),
    ]);

    const identities = await repository.getTrustedSubsForUser(owner.id);
    expect(identities).toHaveLength(2);
    expect(new Set(identities.map((identity) => identity.slug)).size).toBe(2);
    expect(identities.every((identity) => identity.providerSlug === input.slug)).toBe(true);
  });

  test('provider deletion removes the provider and its linked identities', async () => {
    const { owner, provider } = await setup();
    await repository.linkIdentity(provider.id, provider.version, 'subject', owner.id);
    await repository.deleteOIDCProvider(provider.slug, owner.id);

    expect(await repository.getOIDCProviders()).toEqual([]);
    expect(await repository.getTrustedSubsForUser(owner.id)).toEqual([]);
    await expect(repository.getTrustedUserId(provider.id, provider.version, 'subject')).rejects.toThrow('not linked');
  });

  test('other users cannot edit/delete a provider or revoke/link its identities', async () => {
    const { owner, other, provider } = await setup();
    await repository.linkIdentity(provider.id, provider.version, 'subject', owner.id);
    const [identity] = await repository.getTrustedSubsForUser(owner.id);
    if (!identity) throw new Error('Test identity missing');

    await expect(repository.deleteOIDCProvider(provider.slug, other.id)).rejects.toThrow('not found');
    await expect(repository.editOIDCProvider(provider.slug, other.id, EditOIDCProviderDto.parseUnknown(input))).rejects.toThrow('not found');
    await expect(repository.deleteOIDCTrustedSub(identity.slug, other.id)).rejects.toThrow('not found');
    await expect(repository.linkIdentity(provider.id, provider.version, 'subject', other.id)).rejects.toThrow();
    expect(await repository.getTrustedUserId(provider.id, provider.version, 'subject')).toBe(owner.id);
  });

  test('editing keeps a write-only secret unless replaced and invalidates pending provider versions', async () => {
    const { owner, provider } = await setup();
    await repository.linkIdentity(provider.id, provider.version, 'subject', owner.id);
    const { clientSecret: _clientSecret, ...settings } = input;
    const edit = EditOIDCProviderDto.parseUnknown({ ...settings, displayName: 'Renamed' });
    const result = await repository.editOIDCProvider(provider.slug, owner.id, edit);
    const updated = await repository.getOIDCProviderBySlug(provider.slug);

    expect(result.displayName).toBe('Renamed');
    expect(result).not.toHaveProperty('clientSecret');
    expect(updated.clientSecret).toBe(input.clientSecret);
    expect(updated.version).toBe(provider.version + 1);
    await expect(repository.getTrustedUserId(provider.id, provider.version, 'subject')).rejects.toThrow();
    expect(await repository.getTrustedUserId(provider.id, updated.version, 'subject')).toBe(owner.id);
  });

  test('changing provider identity revokes mappings instead of transferring trust to another issuer', async () => {
    const { owner, provider } = await setup();
    await repository.linkIdentity(provider.id, provider.version, 'subject', owner.id);
    await repository.editOIDCProvider(provider.slug, owner.id, EditOIDCProviderDto.parseUnknown({ ...input, issuer: 'https://another.example' }));

    expect(await repository.getTrustedSubsForUser(owner.id)).toEqual([]);
  });

  test('unlinking removes future login authority and reports a second removal as missing', async () => {
    const { owner, provider } = await setup();
    await repository.linkIdentity(provider.id, provider.version, 'subject', owner.id);
    const [identity] = await repository.getTrustedSubsForUser(owner.id);
    if (!identity) throw new Error('Test identity missing');
    await repository.deleteOIDCTrustedSub(identity.slug, owner.id);

    await expect(repository.getTrustedUserId(provider.id, provider.version, 'subject')).rejects.toThrow();
    await expect(repository.deleteOIDCTrustedSub(identity.slug, owner.id)).rejects.toThrow('not found');
  });
});
