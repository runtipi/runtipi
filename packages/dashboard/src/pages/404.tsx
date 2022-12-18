import { useRouter } from 'next/router';
import React from 'react';
import { StatusScreen } from '../components/StatusScreen';

const ErrorPage: React.FC = () => {
  const router = useRouter();

  const handleHome = () => {
    router.push('/');
  };

  return <StatusScreen loading={false} title="404" subtitle="Page not found" actionTitle="Home page" onAction={handleHome} />;
};

export default ErrorPage;
