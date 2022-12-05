import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { ApolloProvider } from '@apollo/client';
import Head from 'next/head';
import useCachedResources from '../hooks/useCachedRessources';
import '../styles/global.css';
import '../styles/global.scss';
import { useUIStore } from '../state/uiStore';
import { ToastProvider } from '../components/hoc/ToastProvider';
import { StatusProvider } from '../components/hoc/StatusProvider';
import { AuthProvider } from '../components/hoc/AuthProvider';
import { StatusScreen } from '../components/StatusScreen';

if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
  // eslint-disable-next-line global-require
  require('../mocks');
}

function MyApp({ Component, pageProps }: AppProps) {
  const { setDarkMode } = useUIStore();

  // check theme on component mount
  useEffect(() => {
    const themeCheck = () => {
      if (localStorage.darkMode === 'true' || (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('theme-dark');
        setDarkMode(true);
      } else {
        document.body.classList.remove('theme-light');
        setDarkMode(false);
      }
    };
    themeCheck();
  }, [setDarkMode]);

  const { client } = useCachedResources();
  if (!client) {
    return <StatusScreen title="" subtitle="" />;
  }

  return (
    <main className="h-100">
      <ApolloProvider client={client}>
        <Head>
          <title>Tipi</title>
        </Head>
        <ToastProvider>
          <StatusProvider>
            <AuthProvider>
              <Component {...pageProps} />
            </AuthProvider>
          </StatusProvider>
        </ToastProvider>
      </ApolloProvider>
    </main>
  );
}

export default MyApp;
