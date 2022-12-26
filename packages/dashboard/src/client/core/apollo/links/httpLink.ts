import { HttpLink } from '@apollo/client';

const httpLink = new HttpLink({
  uri: '/api-legacy/graphql',
});

export default httpLink;
