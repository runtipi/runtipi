import { getAllAppStoresOptions } from '@/api-client/@tanstack/react-query.gen';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export const AppStoresContainer = () => {
  const { t } = useTranslation();

  const { data } = useSuspenseQuery({
    ...getAllAppStoresOptions(),
  });

  return (
    <div className="card-body">
      <div>App store</div>
    </div>
  );
};
