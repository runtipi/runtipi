import { HttpLink } from '@apollo/client';

const httpLink = (url: string) => {
  return new HttpLink({
    uri: `${url}/graphql`,
  });
};

export default httpLink;
