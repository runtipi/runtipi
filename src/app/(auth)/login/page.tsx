import { redirect } from 'next/navigation';
import { getClass } from 'src/inversify.config';
import { LoginContainer } from './components/LoginContainer';

export default async function LoginPage() {
  const authQueries = getClass('IAuthQueries');
  const sessionManager = getClass('ISessionManager');
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
