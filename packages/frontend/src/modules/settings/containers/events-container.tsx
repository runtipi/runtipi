import { getAppEventsOptions } from '@/api-client/@tanstack/react-query.gen';
import { IconSubtask } from '@tabler/icons-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { AppEventsTable } from '../components/app-events-table/app-events-table';

export const EventsContainer = () => {
  const { data } = useSuspenseQuery({
    ...getAppEventsOptions(),
  });

  return (
    <div className="card-body">
      <div className="d-flex align-items-center mb-2">
        <IconSubtask className="me-2" />
        <h2 className="mb-0">Events</h2>
      </div>
      <p className="text-muted">Manage the running events.</p>
      <AppEventsTable events={data.events} />
    </div>
  );
};
