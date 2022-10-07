import '@fontsource/open-sans/700.css';
import '@fontsource/open-sans/400.css';
import '../styles/globals.css';
import { ChakraProvider } from '@chakra-ui/react';
import type { AppProps } from 'next/app';
import { theme } from '../styles/theme';
import AuthWrapper from '../modules/Auth/containers/AuthWrapper';
import { ApolloProvider } from '@apollo/client';
import useCachedResources from '../hooks/useCachedRessources';
import Head from 'next/head';
import StatusWrapper from '../components/StatusScreens/StatusWrapper';

function MyApp({ Component, pageProps }: AppProps) {
  const { client } = useCachedResources();

  if (!client) {
    return <div>loading...</div>;
  }

  return (
    <ApolloProvider client={client}>
      <ChakraProvider theme={theme}>
        <Head>
          <title>Tipi</title>
        </Head>
        <StatusWrapper>
          <AuthWrapper>
            <Component {...pageProps} />
          </AuthWrapper>
        </StatusWrapper>
      </ChakraProvider>
    </ApolloProvider>
  );
}

export default MyApp;
