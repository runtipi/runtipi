import { AppDetailsPage } from '../../client/modules/Apps/pages/AppDetailsPage';

const Page = AppDetailsPage;

Page.getInitialProps = (ctx) => {
  const { query } = ctx;

  const appId = String(query.id);

  return { appId, refSlug: 'apps', refTitle: 'Apps' };
};

export default Page;
