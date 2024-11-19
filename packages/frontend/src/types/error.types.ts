export class TranslatableError extends Error {
  constructor(
    message: string,
    public intlParams?: Record<string, string>,
  ) {
    super(message);
    this.name = 'TranslatableError';
  }
}
