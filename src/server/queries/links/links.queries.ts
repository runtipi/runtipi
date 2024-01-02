import { Database } from '@/server/db';
import { linkTable } from '@/server/db/schema';
import { LinkInfo } from '@runtipi/shared';
import { eq } from 'drizzle-orm';

export class LinkQueries {
  private db;

  constructor(p: Database) {
    this.db = p;
  }

  public async addLink(link: LinkInfo) {
    const { title, url, userId } = link;
    const newLinks = await this.db.insert(linkTable).values({ title, url, userId }).returning().execute();
    return newLinks[0];
  }

  public async getLinks(userId: number) {
    const links = await this.db.query.linkTable.findMany({ where: eq(linkTable.userId, userId) });
    return links;
  }
}