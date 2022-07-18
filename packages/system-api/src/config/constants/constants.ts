/* eslint-disable @typescript-eslint/naming-convention */
const __prod__ = process.env.NODE_ENV === 'production';

const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 365 * 10;

export { __prod__, COOKIE_MAX_AGE };
