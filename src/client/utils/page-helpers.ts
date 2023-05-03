import { GetServerSideProps } from 'next';

export const getAuthedPageProps: GetServerSideProps = async (ctx) => {
  const { userId } = ctx.req.session;

  if (!userId) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return { props: {} };
};
