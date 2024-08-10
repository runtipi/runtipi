import { getUserFromCookie } from '@/server/common/session.helpers';
import type { IAuthQueries } from '@/server/queries/auth/auth.queries';
import { redirect } from 'next/navigation';
import React from 'react';
import { container } from 'src/inversify.config';
import { LoginContainer } from './components/LoginContainer';

export default async function LoginPage() {
  const authQueries = container.get<IAuthQueries>('IAuthQueries');
  const isConfigured = await authQueries.getFirstOperator();

  if (!isConfigured) {
    redirect('/register');
  }

  const user = await getUserFromCookie();

  if (user) {
    redirect('/dashboard');
  }

  return <LoginContainer />;
}
