import React from 'react';
import { redirect } from 'next/navigation';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { AuthQueries } from '@/server/queries/auth/auth.queries';
import { db } from '@/server/db';
import { LoginContainer } from './components/LoginContainer';

export default async function LoginPage() {
  const authQueries = new AuthQueries(db);
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
