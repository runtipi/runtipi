import { getAppEventsOptions } from '@/api-client/@tanstack/react-query.gen';
import { IconSubtask } from '@tabler/icons-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { EventsTable } from '../components/events-table/events-table';
import { useTranslation } from 'react-i18next';

export const EventsContainer = () => {
  const { t } = useTranslation();

  const { data } = useSuspenseQuery({
    ...getAppEventsOptions(),
  });

  return (
    <div className="card-body">
      <div className="d-flex align-items-center mb-2">
        <IconSubtask className="me-2" />
        <h2 className="mb-0">{t('SETTINGS_EVENTS_TITLE')}</h2>
      </div>
      <p className="text-muted">{t('SETTINGS_EVENTS_SUBTITLE')}</p>
      <EventsTable events={data.events} />
    </div>
  );
};
