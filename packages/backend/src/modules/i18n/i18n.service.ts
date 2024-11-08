import path from 'node:path';
import { Injectable } from '@nestjs/common';
import i18n from 'i18next';
import Backend from 'i18next-fs-backend';
import type { FsBackendOptions } from 'i18next-fs-backend';

@Injectable()
export class I18nService {
  constructor() {
    i18n.use(Backend).init<FsBackendOptions>({
      initImmediate: false,
      fallbackLng: 'en',
      backend: {
        loadPath:
          process.env.NODE_ENV === 'production'
            ? path.join(process.cwd(), 'assets', 'translations', '{{lng}}.json')
            : path.join(process.cwd(), 'src', 'modules', 'i18n', 'translations', '{{lng}}.json'),
      },
    });
  }

  async getTranslation(language: string, namespace: string) {
    // Load translation for specific language and namespace
    return i18n.getResourceBundle(language, namespace);
  }
}
