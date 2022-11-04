import { ApolloClient, from, InMemoryCache } from '@apollo/client';
import links from './links';

export const createApolloClient = async (url: string): Promise<ApolloClient<any>> => {
  const additiveLink = from([links.errorLink, links.authLink, links.httpLink(url)]);

  return new ApolloClient({
    link: additiveLink,
    cache: new InMemoryCache(),
  });
};
