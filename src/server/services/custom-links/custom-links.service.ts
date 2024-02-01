import { Database, db } from '@/server/db';
import { LinkInfo } from '@runtipi/shared';
import { LinkQueries } from '@/server/queries/links/links.queries';
import { TipiConfig } from '@/server/core/TipiConfig';
import { TranslatedError } from '@/server/utils/errors';

export class CustomLinksServiceClass {
  private queries;

  constructor(p: Database = db) {
    this.queries = new LinkQueries(p);
  }

  public add = async (link: LinkInfo, userId: number) => {
    if (TipiConfig.getConfig().demoMode) {
      throw new TranslatedError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    }

    const linkResponse = await this.queries.addLink(link, userId);
    return linkResponse;
  };

  public edit = async (link: LinkInfo, userId: number) => {
    const linkResponse = await this.queries.editLink(link, userId);
    return linkResponse;
  };

  public delete = async (linkId: number, userId: number) => {
    const deletedLink = await this.queries.deleteLink(linkId, userId);
    return deletedLink;
  };

  public async getLinks(userId: number | undefined) {
    if (!userId) return [];

    return this.queries.getLinks(userId);
  }
}
