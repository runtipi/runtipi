export type ForwardAuthSession = {
  sessionId: string;
  host: string;
};

export const forwardAuthSessionKey = (id: string) => `forward-auth-session:${id}`;

export const forwardAuthSessionIndexKey = (sessionId: string, type: 'grant' | 'session', id: string) =>
  `forward-auth-by-session:${sessionId}:${type}:${id}`;

/**
 * Parse a forward-auth session record read back from the cache.
 *
 * @param token - The raw value stored in the cache
 * @returns The parsed session, or null when the record is missing or malformed
 */
export const parseForwardAuthSession = (token: string) => {
  try {
    const session = JSON.parse(token) as ForwardAuthSession;
    if (!session.sessionId || !session.host) {
      return null;
    }

    return { sessionId: session.sessionId, host: session.host.toLowerCase() };
  } catch {
    return null;
  }
};
