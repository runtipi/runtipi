import { HttpLink } from '@apollo/client';

const httpLink = (url: string) => {
  return new HttpLink({
    uri: `${url}/graphql`,
    credentials: 'include',
  });
};

export default httpLink;
