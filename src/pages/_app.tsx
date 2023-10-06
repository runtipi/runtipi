import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../client/styles/global.css';
import '../client/styles/global.scss';
import 'react-tooltip/dist/react-tooltip.css';
import { Toaster } from 'react-hot-toast';
import { useUIStore } from '../client/state/uiStore';
import { StatusProvider } from '../client/components/hoc/StatusProvider';

/**
 * Next.js App component
 *
 * @param {AppProps} props - props passed to the app
 * @returns {JSX.Element} - JSX element
 */
function MyApp({ Component, pageProps }: AppProps) {
  const { setDarkMode } = useUIStore();

  // check theme on component mount
  useEffect(() => {
    const themeCheck = () => {
      if (localStorage.darkMode === 'true' || (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.dataset.bsTheme = 'dark';
        setDarkMode(true);
      } else {
        document.body.dataset.bsTheme = 'light';
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
      <StatusProvider>
        <Component {...pageProps} />
      </StatusProvider>
      <Toaster />
    </main>
  );
}

export default MyApp;
