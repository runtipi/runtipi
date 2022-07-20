import '@fontsource/open-sans/700.css';
import '@fontsource/open-sans/400.css';
import '../styles/globals.css';
import { ChakraProvider } from '@chakra-ui/react';
import type { AppProps } from 'next/app';
import { theme } from '../styles/theme';
import AuthWrapper from '../modules/Auth/containers/AuthWrapper';
import { ApolloProvider } from '@apollo/client';
import useCachedResources from '../hooks/useCachedRessources';

function MyApp({ Component, pageProps }: AppProps) {
  const { client } = useCachedResources();

  if (!client) {
    return null;
  }

  return (
    <ApolloProvider client={client}>
      <ChakraProvider theme={theme}>
        <AuthWrapper>
          <Component {...pageProps} />
        </AuthWrapper>
      </ChakraProvider>
    </ApolloProvider>
  );
}

export default MyApp;
