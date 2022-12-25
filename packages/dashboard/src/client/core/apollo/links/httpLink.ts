import { HttpLink } from '@apollo/client';

const httpLink = new HttpLink({
  uri: '/api/graphql',
});

export default httpLink;
