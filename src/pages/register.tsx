import { GetServerSideProps } from 'next';

export { RegisterPage as default } from '../client/modules/Auth/pages/RegisterPage';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};
