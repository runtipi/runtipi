import jwt from 'jsonwebtoken';
import TipiCache from '../../core/TipiCache';
import { getConfig } from '../../core/TipiConfig';
import { getServerAuthSession } from '../get-server-auth-session';

jest.mock('redis');

describe('getServerAuthSession', () => {
  it('should return null if no token is provided', async () => {
    // @ts-expect-error - wrong res
    const result = await getServerAuthSession({ req: { headers: { authorization: null } }, res: {} });
    expect(result).toBeNull();
  });

  it('should return null if an invalid token is provided', async () => {
    // @ts-expect-error - wrong res
    const result = await getServerAuthSession({ req: { headers: { authorization: 'Bearer invalid_token' } }, res: {} });
    expect(result).toBeNull();
  });

  it('should return null if there is no session id in the cache', async () => {
    const validToken = jwt.sign('12', getConfig().jwtSecret);
    // @ts-expect-error - wrong res
    const result = await getServerAuthSession({ req: { headers: { authorization: `Bearer ${validToken}` } }, res: {} });
    expect(result).toBeNull();
  });

  it('should return the user id and session id if a valid token is provided', async () => {
    const validToken = jwt.sign({ id: 12, session: 'session_id' }, getConfig().jwtSecret);
    TipiCache.set('session_id', '12');
    // @ts-expect-error - wrong res
    const result = await getServerAuthSession({ req: { headers: { authorization: `Bearer ${validToken}` } }, res: {} });
    expect(result).toEqual({ userId: 12, id: 'session_id' });
  });
});
