import { AppDetailsPage } from '../../client/modules/Apps/pages/AppDetailsPage';

const Page = AppDetailsPage;

Page.getInitialProps = (ctx) => {
  const { query } = ctx;

  const appId = String(query.id);

  return { appId, refSlug: 'app-store', refTitle: 'App Store' };
};

export default Page;
