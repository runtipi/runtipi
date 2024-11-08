import { Controller, Get, Param } from '@nestjs/common';
import { I18nService } from './i18n.service';

@Controller('i18n')
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  @Get('/locales/:lng/:ns.json')
  async getTranslation(@Param('lng') lng: string, @Param('ns') ns: string) {
    const translations = await this.i18nService.getTranslation(lng, ns);
    return translations || {};
  }
}
