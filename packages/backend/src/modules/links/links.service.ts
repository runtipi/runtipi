import { TranslatableError } from '@/common/error/translatable-error';
import { ConfigurationService } from '@/core/config/configuration.service';
import { Injectable } from '@nestjs/common';
import type { EditLinkBodyDto, LinkBodyDto } from './dto/links.dto';
import { LinksRepository } from './links.repository';

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
}
