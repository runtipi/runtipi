export type ForwardAuthSession = {
  sessionId: string;
  host: string;
};

export const forwardAuthSessionKey = (id: string) => `forward-auth-session:${id}`;

export const forwardAuthSessionIndexKey = (sessionId: string, type: 'grant' | 'session', id: string) =>
  `forward-auth-by-session:${sessionId}:${type}:${id}`;

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
