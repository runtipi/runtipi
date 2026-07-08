import { DATABASE, type Database } from '@/core/database/database.module';
import { Inject, Injectable } from '@nestjs/common';
import { CreateOIDCProviderDto, EditOIDCProviderDto } from './dto/oidc.dto';
import { oidcProviders, oidcTrustedSubs } from '@/core/database/drizzle/schema';
import { and, eq, sql } from 'drizzle-orm';

@Injectable()
export class OIDCRepository {
  constructor(@Inject(DATABASE) private db: Database) {}

  /**
   * Adds a new OIDC provider to the database.
   * @param {CreateOIDCProviderDto} provider - The provider information to be added.
   * @param {number} userId - The user ID to assign the provider to.
   * @returns The newly added provider.
   */
  public async createOIDCProvider(provider: CreateOIDCProviderDto, userId: number): Promise<CreateOIDCProviderDto | undefined> {
    const { slug, displayName, clientId, clientSecret, authorizeUrl, tokenUrl, userInfoUrl } = provider;
    const providers = await this.db
      .insert(oidcProviders)
      .values({
        slug,
        displayName,
        clientId,
        clientSecret,
        authorizeUrl,
        tokenUrl,
        userInfoUrl,
        userId,
      })
      .returning();
    return providers[0];
  }

  /**
   * Edits an existing OIDC provider in the database.
   * @param {EditOIDCProviderDto} provider - The updated provider information.
   * @param {number} id - The provider ID to update.
   * @returns The updated provider.
   */
  public async editOIDCProvider(id: number, provider: EditOIDCProviderDto) {
    const providers = await this.db
      .update(oidcProviders)
      .set({ ...provider, updatedAt: sql`now()` })
      .where(eq(oidcProviders.id, id))
      .returning();
    return providers[0];
  }

  /**
   * Stores a new OIDC sub entry.
   * @param {string} sub - The sub of the trusted entry to be stored.
   * @param {number} userId - The ID of the user to associate the trusted sub entry with.
   * @param {number} providerId - The ID of the provider to associate the trusted sub entry with.
   * @param {string} slug - The short (`provider-slug`-`last-4-char-of-sub`) identifier for the sub.
   * @retruns The newly creates sub.
   */
  public async storeOIDCTrustedSub(sub: string, userId: number, providerId: number, slug: string) {
    const subs = await this.db.insert(oidcTrustedSubs).values({ userId, providerId, slug, sub }).returning();
    return subs[0];
  }

  /**
   * Deletes a trusted sub entry by its ID.
   * @param {number} id - The ID of the trusted entry to be deleted.
   */
  public async deleteOIDCTrustedSub(id: number) {
    await this.db.delete(oidcTrustedSubs).where(eq(oidcTrustedSubs.id, id));
  }

  /**
   * Deletes an OIDC provider from the database alongside the trusted subs.
   * @param {number} providerId - The ID of the provider to be deleted.
   */
  public async deleteOIDCProvider(providerId: number) {
    await this.db.transaction(async (tx) => {
      await tx.delete(oidcTrustedSubs).where(eq(oidcTrustedSubs.providerId, providerId));
      await tx.delete(oidcTrustedSubs).where(eq(oidcProviders.id, providerId));
    });
  }

  /**
   * Retrieves all OIDC providers.
   * @returns A list of all OIDC providers.
   */
  public async getOIDCProviders() {
    return this.db.select().from(oidcProviders).orderBy(oidcProviders.displayName);
  }

  /**
   * Retrieves all OIDC providers for a specific user.
   * @param {number} userId - The user ID to get the OIDC providers for.
   * @returns A list of all OIDC providers for the user.
   */
  public async getOIDCProvidersForUser(userId: number) {
    return this.db.select().from(oidcProviders).where(eq(oidcProviders.userId, userId)).orderBy(oidcProviders.displayName);
  }

  /**
   * Retrieves all trusted subs for the OIDC provider.
   * @param {number} providerId - The ID of the provider to returns trusted subs for.
   * @returns The list of the trusted subs for this provider.
   */
  public async getOIDCTrustedSubsForOIDCProvider(providerId: number) {
    return this.db.select().from(oidcTrustedSubs).where(eq(oidcTrustedSubs.providerId, providerId)).orderBy(oidcTrustedSubs.slug);
  }

  /**
   * Get an OIDC provider by the ID.
   * @param {number} providerId - The ID of the provider to retrieve.
   * @returns The provider with the matching ID.
   */
  public async getOIDCProviderById(providerId: number) {
    return (await this.db.select().from(oidcProviders).where(eq(oidcProviders.id, providerId)))[0];
  }

  /**
   * Get an OIDC provider by the slug.
   * @param {string} slug - The slug of the provider to retrieve.
   * @returns The provider with the matching slug.
   */
  public async getOIDCProviderBySlug(slug: string) {
    return (await this.db.select().from(oidcProviders).where(eq(oidcProviders.slug, slug)))[0];
  }

  /**
   * Get an OIDC trusted sub by the slug.
   * @param {string} slug - The slug of the sub to retrieve.
   * @returns The trusted sub with the matching slug.
   */
  public async getOIDCTrustedSubBySlug(slug: string) {
    return (await this.db.select().from(oidcTrustedSubs).where(eq(oidcTrustedSubs.slug, slug)))[0];
  }

  /**
   * Get a trusted sub by the sub.
   * @param {number} providerId - The ID of the provider the sub belongs to.
   * @param {string} sub - The sub to look for.
   * @returns The trusted sub entry with the matching sub and provider ID.
   */
  public async getOIDCTrustedSubBySub(providerId: number, sub: string) {
    return (
      await this.db
        .select()
        .from(oidcTrustedSubs)
        .where(and(eq(oidcTrustedSubs.sub, sub), eq(oidcTrustedSubs.providerId, providerId)))
    )[0];
  }
}
