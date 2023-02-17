import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import useCachedResources from '../client/hooks/useCachedRessources';
import '../client/styles/global.css';
import '../client/styles/global.scss';
import { useUIStore } from '../client/state/uiStore';
import { ToastProvider } from '../client/components/hoc/ToastProvider';
import { StatusProvider } from '../client/components/hoc/StatusProvider';
import { AuthProvider } from '../client/components/hoc/AuthProvider';
import { StatusScreen } from '../client/components/StatusScreen';
import { trpc } from '../client/utils/trpc';
import { SystemStatus, useSystemStore } from '../client/state/systemStore';

function MyApp({ Component, pageProps }: AppProps) {
  const { setDarkMode } = useUIStore();
  const { setStatus, setVersion } = useSystemStore();

  trpc.system.status.useQuery(undefined, { networkMode: 'online', onSuccess: (d) => setStatus((d.status as SystemStatus) || 'RUNNING') });
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

  const { isLoadingComplete } = useCachedResources();
  if (!isLoadingComplete) {
    return <StatusScreen title="" subtitle="" />;
  }

  return (
    <main className="h-100">
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
    </main>
  );
}

export default trpc.withTRPC(MyApp);
