import { TranslatableError } from '@/common/error/translatable-error.js';
import { ConfigurationService } from '@/core/config/configuration.service.js';
import { Injectable } from '@nestjs/common';
import type { EditLinkBodyDto, LinkBodyDto } from './dto/links.dto.js';
import { LinksRepository } from './links.repository.js';

@Injectable()
export class LinksService {
  constructor(
    private readonly config: ConfigurationService,
    private readonly linksRepository: LinksRepository,
  ) {}

  public add = async (link: LinkBodyDto, userId: number) => {
    if (this.config.get('demoMode')) {
      throw new TranslatableError('SERVER_ERROR_NOT_ALLOWED_IN_DEMO');
    }

    return this.linksRepository.addLink(link, userId);
  };

  public edit = async (linkId: number, link: EditLinkBodyDto, userId: number) => {
    return this.linksRepository.editLink(linkId, link, userId);
  };

  public delete = async (linkId: number, userId: number) => {
    return this.linksRepository.deleteLink(linkId, userId);
  };

  public async getLinks(userId: number | undefined) {
    if (!userId) return [];

    return this.linksRepository.getLinks(userId);
  }

  /**
   * Gets all links that are marked as visible on the guest dashboard.
   * @returns An array of links that are visible on the guest dashboard.
   */
  public async getGuestDashboardLinks() {
    return this.linksRepository.getGuestDashboardLinks();
  }
}
