import { createTranslator } from 'next-intl';
import messages from '../../client/messages/en.json';

const t = createTranslator({ locale: 'en', messages });
export type MessageKey = Parameters<typeof t>[0];

export class TranslatedError extends Error {
  constructor(message: MessageKey) {
    super(message);

    this.name = 'TranslatedError';
  }
}
