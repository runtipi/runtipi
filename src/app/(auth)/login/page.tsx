import type { ISessionManager } from '@/server/common/session-manager';
import type { IAuthQueries } from '@/server/queries/auth/auth.queries';
import { redirect } from 'next/navigation';
import React from 'react';
import { container } from 'src/inversify.config';
import { LoginContainer } from './components/LoginContainer';

export default async function LoginPage() {
  const authQueries = container.get<IAuthQueries>('IAuthQueries');
  const sessionManager = container.get<ISessionManager>('ISessionManager');
  const isConfigured = await authQueries.getFirstOperator();

  if (!isConfigured) {
    redirect('/register');
  }

  const user = await sessionManager.getUserFromCookie();

  if (user) {
    redirect('/dashboard');
  }

  return <LoginContainer />;
}
