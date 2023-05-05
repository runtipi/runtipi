import { getAuthedPageProps } from '../page-helpers';

describe('getAuthedPageProps', () => {
  it('should redirect to /login if there is no user id in session', async () => {
    // arrange
    const ctx = { req: { session: {} } };

    // act
    // @ts-expect-error - we're passing in a partial context
    const { redirect } = await getAuthedPageProps(ctx);

    // assert
    expect(redirect.destination).toBe('/login');
    expect(redirect.permanent).toBe(false);
  });

  it('should return props if there is a user id in session', async () => {
    // arrange
    const ctx = { req: { session: { userId: '123' } } };

    // act
    // @ts-expect-error - we're passing in a partial context
    const { props } = await getAuthedPageProps(ctx);

    // assert
    expect(props).toEqual({});
  });
});
