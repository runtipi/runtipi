import { Module } from '@nestjs/common';
import { I18nController } from './i18n.controller.js';
import { I18nService } from './i18n.service.js';

@Module({
  imports: [],
  controllers: [I18nController],
  providers: [I18nService],
})
export class I18nModule {}
