import { ApolloClient, from, InMemoryCache } from '@apollo/client';
import links from './links';

export const createApolloClient = async (ip: string): Promise<ApolloClient<any>> => {
  const additiveLink = from([links.errorLink, links.httpLink(ip)]);

  return new ApolloClient({
    link: additiveLink,
    cache: new InMemoryCache(),
  });
};
