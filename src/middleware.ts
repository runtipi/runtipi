import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  }

  return response;
}
