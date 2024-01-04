import { ensureUser } from '@/actions/utils/ensure-user';
import { Database } from '@/server/db';
import { linkTable } from '@/server/db/schema';
import { LinkInfo } from '@runtipi/shared';
import { handleActionError } from '@/actions/utils/handle-action-error';
import { eq } from 'drizzle-orm';

export class LinkQueries {
  private db;

  constructor(p: Database) {
    this.db = p;
  }

  public async addLink(link: LinkInfo) {
    try {
      const user = await ensureUser();

      const { title, url, iconURL } = link;
      const newLinks = await this.db.insert(linkTable).values({ title, url, iconURL, userId: user.id }).returning().execute();
      return newLinks[0];
    } catch (e) {
      return handleActionError(e);
    }
  }

  public async getLinks(userId: number) {
    const links = await this.db.query.linkTable.findMany({ where: eq(linkTable.userId, userId) });
    return links;
  }
}