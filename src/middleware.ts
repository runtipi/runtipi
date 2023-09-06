import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day

/**
 * Middleware to set session ID in request headers
 * @param {NextRequest} request - Request object
 */
export async function middleware(request: NextRequest) {
  let sessionId = '';

  const cookie = request.cookies.get('tipi.sid')?.value;

  // Check if session ID exists in cookies
  if (cookie) {
    sessionId = cookie;
  }

  const requestHeaders = new Headers(request.headers);

  if (sessionId) {
    requestHeaders.set('x-session-id', sessionId);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (sessionId) {
    response.headers.set('x-session-id', sessionId);

    response.cookies.set('tipi.sid', sessionId, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: false,
      sameSite: false,
    });
  }

  return response;
}
