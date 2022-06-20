import { HttpLink } from '@apollo/client';

const httpLink = (ip: string) =>
  new HttpLink({
    uri: `http://${ip}:3001/graphql`,
    credentials: 'include',
  });

export default httpLink;
