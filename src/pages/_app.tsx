import React, { useEffect } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../client/styles/global.css';
import '../client/styles/global.scss';
import 'react-tooltip/dist/react-tooltip.css';
import { useUIStore } from '../client/state/uiStore';
import { ToastProvider } from '../client/components/hoc/ToastProvider';
import { StatusProvider } from '../client/components/hoc/StatusProvider';
import { trpc } from '../client/utils/trpc';
import { SystemStatus, useSystemStore } from '../client/state/systemStore';

/**
 * Next.js App component
 *
 * @param {AppProps} props - props passed to the app
 * @returns {JSX.Element} - JSX element
 */
function MyApp({ Component, pageProps }: AppProps) {
  const { setDarkMode } = useUIStore();
  const { setStatus, setVersion, pollStatus } = useSystemStore();

  trpc.system.status.useQuery(undefined, { networkMode: 'online', refetchInterval: 2000, onSuccess: (d) => setStatus((d.status as SystemStatus) || 'RUNNING'), enabled: pollStatus });
  const version = trpc.system.getVersion.useQuery(undefined, { networkMode: 'online' });

  useEffect(() => {
    if (version.data) {
      setVersion(version.data);
    }
  }, [setVersion, version.data]);

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

  return (
    <main className="h-100">
      <Head>
        <title>Tipi</title>
      </Head>
      <ToastProvider>
        <StatusProvider>
          <Component {...pageProps} />
        </StatusProvider>
      </ToastProvider>
      <ReactQueryDevtools />
    </main>
  );
}

export default trpc.withTRPC(MyApp);
