import { type TranslationValues, createTranslator } from 'next-intl';
import messages from '../../client/messages/en.json';
import { getClass } from 'src/inversify.config';

const t = createTranslator({ locale: 'en', messages });
export type MessageKey = Parameters<typeof t>[0];

export class TranslatedError extends Error {
  public readonly variableValues: TranslationValues;

  public readonly status: number;

  constructor(message: MessageKey, variableValues: TranslationValues = {}, status?: number) {
    super(message);

    const logger = getClass('ILogger');
    logger.error(`server error: ${t(message, variableValues)}`);

    this.name = 'TranslatedError';
    this.variableValues = variableValues;
    this.status = status || 500;
  }
}
