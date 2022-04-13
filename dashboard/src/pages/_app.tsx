import { ChakraProvider } from '@chakra-ui/react';
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useNetworkStore } from '../state/networkStore';

function MyApp({ Component, pageProps }: AppProps) {
  const { fetchInternalIp } = useNetworkStore();

  useEffect(() => {
    fetchInternalIp();
  }, [fetchInternalIp]);

  return (
    <ChakraProvider>
      <Component {...pageProps} />
    </ChakraProvider>
  );
}

export default MyApp;
