import { ApolloClient, from, InMemoryCache } from '@apollo/client';
import links from './links';

export const createApolloClient = (): ApolloClient<unknown> => {
  const additiveLink = from([links.errorLink, links.authLink, links.httpLink]);

  return new ApolloClient({
    link: additiveLink,
    cache: new InMemoryCache(),
  });
};
