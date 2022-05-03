import '@fontsource/open-sans/700.css';
import '@fontsource/open-sans/400.css';
import '../styles/globals.css';
import { ChakraProvider } from '@chakra-ui/react';
import type { AppProps } from 'next/app';
import { theme } from '../styles/theme';
import AuthWrapper from '../modules/Auth/containers/AuthWrapper';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={theme}>
      <AuthWrapper>
        <Component {...pageProps} />
      </AuthWrapper>
    </ChakraProvider>
  );
}

export default MyApp;
