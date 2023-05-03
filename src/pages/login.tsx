import { GetServerSideProps } from 'next';

export { LoginPage as default } from '../client/modules/Auth/pages/LoginPage';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};
