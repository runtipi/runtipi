import { HttpException, type HttpExceptionOptions } from '@nestjs/common';
import messages from '@/modules/i18n/translations/en.json';

type TranslationKey = keyof typeof messages;

export class TranslatableError extends HttpException {
  constructor(message: TranslationKey, intlParams?: Record<string, string | undefined>, statusCode = 500, options?: HttpExceptionOptions) {
    super({ message, intlParams }, statusCode, options);
  }
}
