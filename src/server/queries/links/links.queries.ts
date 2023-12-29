import { Database } from '@/server/db';
import { linkTable } from '@/server/db/schema';

export class LinkQueries {
  private db;

  constructor(p: Database) {
    this.db = p;
  }

  public async addLink(title: string, url: string, userId: number) {
    const newLinks = await this.db.insert(linkTable).values({ title, url, userId }).returning().execute();
    return newLinks[0];
  }
}