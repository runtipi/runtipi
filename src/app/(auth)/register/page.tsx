import type { ISessionManager } from '@/server/common/session-manager';
import type { IAuthQueries } from '@/server/queries/auth/auth.queries';
import { redirect } from 'next/navigation';
import React from 'react';
import { container } from 'src/inversify.config';
import { RegisterContainer } from './components/RegisterContainer';

export default async function LoginPage() {
  const sessionManager = container.get<ISessionManager>('ISessionManager');
  const user = await sessionManager.getUserFromCookie();
  if (user) {
    redirect('/dashboard');
  }

  const authQueries = container.get<IAuthQueries>('IAuthQueries');
  const isConfigured = await authQueries.getFirstOperator();

  if (isConfigured) {
    redirect('/login');
  }

  return <RegisterContainer />;
}
