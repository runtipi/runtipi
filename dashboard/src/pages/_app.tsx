import '@fontsource/open-sans/700.css';
import '@fontsource/open-sans/400.css';
import '../styles/globals.css';
import { ChakraProvider } from '@chakra-ui/react';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useNetworkStore } from '../state/networkStore';
import { theme } from '../styles/theme';

function MyApp({ Component, pageProps }: AppProps) {
  const { fetchInternalIp } = useNetworkStore();

  useEffect(() => {
    fetchInternalIp();
  }, [fetchInternalIp]);

  return (
    <ChakraProvider theme={theme}>
      <Component {...pageProps} />
    </ChakraProvider>
  );
}

export default MyApp;
