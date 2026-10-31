import crypto from 'node:crypto';
import { DATABASE, type Database } from '@/core/database/database.module';
import { oidcProviders, oidcTrustedSubs } from '@/core/database/drizzle/schema';
import { ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type { CreateOIDCProviderDto, EditOIDCProviderDto } from './dto/oidc.dto';

const providerFields = {
  slug: oidcProviders.slug,
  displayName: oidcProviders.displayName,
  clientId: oidcProviders.clientId,
  issuer: oidcProviders.issuer,
  discovery: oidcProviders.discovery,
};

export type OIDCProvider = typeof oidcProviders.$inferSelect;

@Injectable()
export class OIDCRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  getOIDCProviders() {
    return this.db
      .select({ slug: oidcProviders.slug, displayName: oidcProviders.displayName })
      .from(oidcProviders)
      .orderBy(oidcProviders.displayName);
  }

  getOIDCProvidersForUser(userId: number) {
    return this.db.select(providerFields).from(oidcProviders).where(eq(oidcProviders.userId, userId)).orderBy(oidcProviders.displayName);
  }

  async getOIDCProviderBySlug(slug: string) {
    const [provider] = await this.db.select().from(oidcProviders).where(eq(oidcProviders.slug, slug));
    if (!provider) throw new NotFoundException('OIDC provider not found');

    return provider;
  }

  async createOIDCProvider(input: CreateOIDCProviderDto, userId: number) {
    const { slug, displayName, clientId, clientSecret, issuer, discovery } = input;
    const [provider] = await this.db
      .insert(oidcProviders)
      .values({ slug, displayName, clientId, clientSecret, issuer, discovery, userId })
      .onConflictDoNothing({ target: oidcProviders.slug })
      .returning(providerFields);

    if (!provider) throw new ConflictException('OIDC provider slug already exists');

    return provider;
  }

  async editOIDCProvider(slug: string, userId: number, input: EditOIDCProviderDto) {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(oidcProviders)
        .where(and(eq(oidcProviders.slug, slug), eq(oidcProviders.userId, userId)))
        .for('update');
      if (!existing) throw new NotFoundException('OIDC provider not found');

      const { displayName, clientId, clientSecret, issuer, discovery } = input;
      const identityChanged = existing.issuer !== issuer || existing.clientId !== clientId || existing.discovery !== discovery;

      if (identityChanged) {
        await tx.delete(oidcTrustedSubs).where(eq(oidcTrustedSubs.providerId, existing.id));
      }

      const [provider] = await tx
        .update(oidcProviders)
        .set({ displayName, clientId, clientSecret, issuer, discovery, version: sql`${oidcProviders.version} + 1`, updatedAt: sql`now()` })
        .where(eq(oidcProviders.id, existing.id))
        .returning(providerFields);

      if (!provider) throw new NotFoundException('OIDC provider not found');

      return provider;
    });
  }

  async deleteOIDCProvider(slug: string, userId: number) {
    const deleted = await this.db
      .delete(oidcProviders)
      .where(and(eq(oidcProviders.slug, slug), eq(oidcProviders.userId, userId)))
      .returning({ id: oidcProviders.id });
    if (!deleted.length) throw new NotFoundException('OIDC provider not found');
  }

  getTrustedSubsForUser(userId: number) {
    return this.db
      .select({
        slug: oidcTrustedSubs.slug,
        sub: oidcTrustedSubs.sub,
        providerSlug: oidcProviders.slug,
        providerDisplayName: oidcProviders.displayName,
        createdAt: oidcTrustedSubs.createdAt,
      })
      .from(oidcTrustedSubs)
      .innerJoin(oidcProviders, eq(oidcProviders.id, oidcTrustedSubs.providerId))
      .where(eq(oidcTrustedSubs.userId, userId))
      .orderBy(oidcTrustedSubs.createdAt);
  }

  async deleteOIDCTrustedSub(slug: string, userId: number) {
    const deleted = await this.db
      .delete(oidcTrustedSubs)
      .where(and(eq(oidcTrustedSubs.slug, slug), eq(oidcTrustedSubs.userId, userId)))
      .returning({ id: oidcTrustedSubs.id });
    if (!deleted.length) throw new NotFoundException('Trusted identity not found');
  }

  async getTrustedUserId(providerId: number, version: number, sub: string) {
    const [identity] = await this.db
      .select({ userId: oidcTrustedSubs.userId })
      .from(oidcTrustedSubs)
      .innerJoin(oidcProviders, eq(oidcProviders.id, oidcTrustedSubs.providerId))
      .where(and(eq(oidcProviders.id, providerId), eq(oidcProviders.version, version), eq(oidcTrustedSubs.sub, sub)));

    if (!identity) throw new UnauthorizedException('External identity is not linked');

    return identity.userId;
  }

  async linkIdentity(providerId: number, version: number, sub: string, userId: number) {
    return this.db.transaction(async (tx) => {
      const [provider] = await tx
        .select({ id: oidcProviders.id })
        .from(oidcProviders)
        .where(and(eq(oidcProviders.id, providerId), eq(oidcProviders.version, version), eq(oidcProviders.userId, userId)))
        .for('update');
      if (!provider) throw new UnauthorizedException('OIDC provider changed during authorization');

      await tx
        .insert(oidcTrustedSubs)
        .values({ slug: crypto.randomUUID(), providerId, sub, userId })
        .onConflictDoNothing({ target: [oidcTrustedSubs.providerId, oidcTrustedSubs.sub] });

      const [identity] = await tx
        .select({ userId: oidcTrustedSubs.userId })
        .from(oidcTrustedSubs)
        .where(and(eq(oidcTrustedSubs.providerId, providerId), eq(oidcTrustedSubs.sub, sub)));
      if (identity?.userId !== userId) throw new ConflictException('External identity is already linked');
    });
  }
}
