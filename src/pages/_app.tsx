import React, { useEffect } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { NextIntlProvider, createTranslator } from 'next-intl';
import '../client/styles/global.css';
import '../client/styles/global.scss';
import 'react-tooltip/dist/react-tooltip.css';
import { Toaster } from 'react-hot-toast';
import { useLocale } from '@/client/hooks/useLocale';
import { useUIStore } from '../client/state/uiStore';
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
  const { setDarkMode, setTranslator } = useUIStore();
  const { setStatus, setVersion, pollStatus } = useSystemStore();
  const { locale } = useLocale();

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

  useEffect(() => {
    const translator = createTranslator({
      messages: pageProps.messages,
      locale,
    });
    setTranslator(translator);
  }, [pageProps.messages, locale, setTranslator]);

  return (
    <main className="h-100">
      <NextIntlProvider locale={locale} messages={pageProps.messages}>
        <Head>
          <title>Tipi</title>
        </Head>
        <StatusProvider>
          <Component {...pageProps} />
        </StatusProvider>
        <Toaster />
      </NextIntlProvider>
      <ReactQueryDevtools />
    </main>
  );
}

export default trpc.withTRPC(MyApp);
