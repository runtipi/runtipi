import merge from 'lodash.merge';
import { deleteCookie, setCookie } from 'cookies-next';
import { fromPartial } from '@total-typescript/shoehorn';
import { TipiCache } from '@/server/core/TipiCache';
import { getAuthedPageProps, getMessagesPageProps } from '../page-helpers';
import englishMessages from '../../messages/en.json';
import frenchMessages from '../../messages/fr-FR.json';

const cache = new TipiCache('page-helpers.test.ts');

afterAll(async () => {
  await cache.close();
});

describe('test: getAuthedPageProps()', () => {
  it('should redirect to /login if there is no user id in session', async () => {
    // arrange
    const ctx = { req: { headers: {} } };

    // act
    // @ts-expect-error - we're passing in a partial context
    const { redirect } = await getAuthedPageProps(ctx);

    // assert
    expect(redirect.destination).toBe('/login');
    expect(redirect.permanent).toBe(false);
  });

  it('should return props if there is a user id in session', async () => {
    // arrange
    const ctx = { req: { headers: { 'x-session-id': '123' } } };
    await cache.set('session:123', '456');

    // act
    // @ts-expect-error - we're passing in a partial context
    const { props } = await getAuthedPageProps(ctx);

    // assert
    expect(props).toEqual({});
  });
});

describe('test: getMessagesPageProps()', () => {
  beforeEach(() => {
    deleteCookie('tipi-locale');
  });

  it('should return correct messages if the locale is in the session', async () => {
    // arrange
    const ctx = { req: { session: { locale: 'fr' }, headers: {} } };

    // act
    // @ts-expect-error - we're passing in a partial context
    const { props } = await getMessagesPageProps(ctx);

    // assert
    expect(props.messages).toEqual(merge(frenchMessages, englishMessages));
  });

  it('should return correct messages if the locale in the cookie', async () => {
    // arrange
    const ctx = { req: { session: {}, headers: {} } };
    setCookie('tipi-locale', 'fr-FR', { req: fromPartial(ctx.req) });

    // act
    // @ts-expect-error - we're passing in a partial context
    const { props } = await getMessagesPageProps(ctx);

    // assert
    expect(props.messages).toEqual(merge(frenchMessages, englishMessages));
  });

  it('should return correct messages if the locale is detected from the browser', async () => {
    // arrange
    const ctx = { req: { session: {}, headers: { 'accept-language': 'fr-FR' } } };

    // act
    // @ts-expect-error - we're passing in a partial context
    const { props } = await getMessagesPageProps(ctx);

    // assert
    expect(props.messages).toEqual(merge(frenchMessages, englishMessages));
  });

  it('should default to english messages if the locale is not found', async () => {
    // arrange
    const ctx = { req: { session: {}, headers: {} } };

    // act
    // @ts-expect-error - we're passing in a partial context
    const { props } = await getMessagesPageProps(ctx);

    // assert
    expect(props.messages).toEqual(englishMessages);
  });
});
