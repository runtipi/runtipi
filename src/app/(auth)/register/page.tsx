import React from 'react';
import { redirect } from 'next/navigation';
import { getUserFromCookie } from '@/server/common/session.helpers';
import { AuthQueries } from '@/server/queries/auth/auth.queries';
import { db } from '@/server/db';
import { RegisterContainer } from './components/RegisterContainer';

export default async function LoginPage() {
  const user = await getUserFromCookie();
  if (user) {
    redirect('/dashboard');
  }

  const authQueries = new AuthQueries(db);
  const isConfigured = await authQueries.getFirstOperator();

  if (isConfigured) {
    redirect('/login');
  }

  return <RegisterContainer />;
}
