import { getUserFromCookie } from '@/server/common/session.helpers';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { AuthQueries } from '@/server/queries/auth/auth.queries';

export default async function RootPage() {
  const authQueries = new AuthQueries(db);
  const isConfigured = await authQueries.getFirstOperator();

  if (!isConfigured) {
    redirect('/register');
  }

  const user = await getUserFromCookie();

  if (!user) {
    redirect('/login');
  }

  redirect('/dashboard');
}
