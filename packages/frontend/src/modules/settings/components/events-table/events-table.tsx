import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { RelativeDateFormat } from '@/components/date-format/date-format';
import type { GetAppEventsResponse } from '@/api-client';
import { CancelAppEventDialog } from '../cancel-app-event-dialog/cancel-app-event-dialog';
import { useTranslation } from 'react-i18next';

export const EventsTable = ({ events }: GetAppEventsResponse) => {
  const { t } = useTranslation();

  return (
    <div className="d-flex flex-column">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('ID')}</TableHead>
            <TableHead>{t('SETTINGS_EVENTS_CALLER')}</TableHead>
            <TableHead>{t('SETTINGS_EVENTS_QUEUE_NAME')}</TableHead>
            <TableHead>{t('SETTINGS_EVENTS_STARTED_AT')}</TableHead>
            <TableHead>{t('SETTINGS_EVENTS_EXPIRES_AT')}</TableHead>
            <TableHead>{t('SETTINGS_EVENTS_ACTIONS')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted">
                {t('SETTINGS_EVENTS_NO_EVENTS')}
              </TableCell>
            </TableRow>
          )}
          {events.map((event) => (
            <TableRow key={event.requestId}>
              <TableCell>{event.requestId}</TableCell>
              <TableCell>{event.caller}</TableCell>
              <TableCell>{event.queueName}</TableCell>
              <TableCell>
                <RelativeDateFormat date={new Date(event.timestamp)} />
              </TableCell>
              <TableCell>
                <RelativeDateFormat date={new Date(event.timestamp + event.expiration)} />
              </TableCell>
              <TableCell>
                <CancelAppEventDialog id={event.requestId} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
