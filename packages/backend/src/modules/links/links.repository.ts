import { DATABASE, type Database } from '@/core/database/database.module';
import { link as linkTable } from '@/core/database/drizzle/schema';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { EditLinkBodyDto, LinkBodyDto } from './dto/links.dto';

@Injectable()
export class LinksRepository {
  constructor(@Inject(DATABASE) private db: Database) {}

  /**
   * Adds a new link to the database.
   * @param {LinkInfo} link - The link information to be added.
   * @returns The newly added link.
   */
  public async addLink(link: LinkBodyDto, userId: number) {
    const { title, description, url, iconUrl, isVisibleOnGuestDashboard } = link;
    const newLinks = await this.db
      .insert(linkTable)
      .values({ title, description, url, iconUrl, userId, isVisibleOnGuestDashboard: isVisibleOnGuestDashboard || false })
      .returning();
    return newLinks[0];
  }

  /**
   * Edits an existing link in the database.
   * @param {LinkInfo} link - The updated link information.
   * @returns The updated link.
   * @throws Error if no id is provided.
   */
  public async editLink(linkId: number, link: EditLinkBodyDto, userId: number) {
    const { title, description, url, iconUrl, isVisibleOnGuestDashboard } = link;

    const updatedLinks = await this.db
      .update(linkTable)
      .set({ title, description, url, iconUrl, isVisibleOnGuestDashboard, updatedAt: new Date().toISOString() })
      .where(and(eq(linkTable.id, linkId), eq(linkTable.userId, userId)))
      .returning();

    return updatedLinks[0];
  }

  /**
   * Deletes a link from the database.
   * @param {number} linkId - The id of the link to be deleted.
   */
  public async deleteLink(linkId: number, userId: number) {
    await this.db.delete(linkTable).where(and(eq(linkTable.id, linkId), eq(linkTable.userId, userId)));
  }

  /**
   * Retrieves all links for a given user from the database.
   * @param {number} userId - The id of the user.
   * @returns An array of links belonging to the user.
   */
  public async getLinks(userId: number) {
    return this.db.select().from(linkTable).where(eq(linkTable.userId, userId)).orderBy(linkTable.id);
  }

  /**
   * Retrieves all links visible on the guest dashboard.
   * @returns An array of links that are visible on the guest dashboard.
   */
  public async getGuestDashboardLinks() {
    return this.db.select().from(linkTable).where(eq(linkTable.isVisibleOnGuestDashboard, true)).orderBy(linkTable.id);
  }
}
