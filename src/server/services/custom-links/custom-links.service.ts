import type { LinkInfo } from '@runtipi/shared';
import type { ILinkQueries } from '@/server/queries/links/links.queries';
import { TipiConfig } from '@/server/core/TipiConfig';
import { TranslatedError } from '@/server/utils/errors';
import { inject, injectable } from 'inversify';
import type { Link } from '@runtipi/db';

export interface ICustomLinksService {
  add(link: LinkInfo, userId: number): Promise<Link | undefined>;
  edit(link: LinkInfo, userId: number): Promise<Link | undefined>;
  delete(linkId: number, userId: number): Promise<void>;
  getLinks(userId: number | undefined): Promise<Link[]>;
}

@injectable()
export class CustomLinksService implements ICustomLinksService {
  constructor(@inject('ILinkQueries') private queries: ILinkQueries) {}

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
