import { redirect } from 'next/navigation';
import { getClass } from 'src/inversify.config';
import { RegisterContainer } from './components/RegisterContainer';

export default async function LoginPage() {
  const sessionManager = getClass('ISessionManager');
  const authQueries = getClass('IAuthQueries');

  const user = await sessionManager.getUserFromCookie();
  if (user) {
    redirect('/dashboard');
  }

  const isConfigured = await authQueries.getFirstOperator();

  if (isConfigured) {
    redirect('/login');
  }

  return <RegisterContainer />;
}
