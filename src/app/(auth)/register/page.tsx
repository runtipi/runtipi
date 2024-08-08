import React from 'react';
import { redirect } from 'next/navigation';
import { getUserFromCookie } from '@/server/common/session.helpers';
import type { IAuthQueries } from '@/server/queries/auth/auth.queries';
import { RegisterContainer } from './components/RegisterContainer';
import { container } from 'src/inversify.config';

export default async function LoginPage() {
  const user = await getUserFromCookie();
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
