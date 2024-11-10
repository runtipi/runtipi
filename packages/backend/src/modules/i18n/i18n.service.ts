import fs from 'node:fs';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import i18n from 'i18next';
import Backend, { type FsBackendOptions } from 'i18next-fs-backend';

@Injectable()
export class I18nService {
  constructor() {
    let directory = path.join(process.cwd(), 'assets', 'translations');

    if (process.env.NODE_ENV !== 'production') {
      directory = path.join(process.cwd(), 'src', 'modules', 'i18n', 'translations');
    }

    i18n.use(Backend).init<FsBackendOptions>({
      initImmediate: false,
      fallbackLng: 'en',
      lng: 'en',
      preload: fs.readdirSync(directory).map((file) => file.replace('.json', '')),
      backend: {
        loadPath: path.join(directory, '{{lng}}.json'),
      },
    });
  }

  async getTranslation(language: string, namespace: string) {
    // Load translation for specific language and namespace
    return i18n.getResourceBundle(language, namespace);
  }
}
